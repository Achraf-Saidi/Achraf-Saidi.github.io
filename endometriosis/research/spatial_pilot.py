#!/usr/bin/env python3
"""Audited exploratory GeoMx compartment atlas; incomplete QC blocks inference."""
import argparse, csv, gzip, hashlib, io, json, tarfile, urllib.request
from pathlib import Path
import numpy as np
import pandas as pd

FILES = ['GSE263897_family.soft.gz', 'GSE263897_RAW.tar', 'GSE263897_Hs_R_NGS_WTA_v1.0.pkc.gz']

def source_url(name):
    folder = 'soft' if '_family.soft' in name else 'suppl'
    return 'https://ftp.ncbi.nlm.nih.gov/geo/series/GSE263nnn/GSE263897/' + folder + '/' + name

def metadata(data):
    records = []
    for block in data.split('^SAMPLE = ')[1:]:
        lines = block.splitlines()
        row = {'gsm': lines[0].strip()}
        for line in lines:
            if line.startswith('!Sample_characteristics_ch1 = '):
                k, v = line.split(' = ', 1)[1].split(': ', 1)
                row[k] = v
            if line.startswith('!Sample_supplementary_file_1 = '):
                row['filename'] = line.rsplit('/', 1)[1]
            if line.startswith('!Sample_title = '):
                row['title'] = line.split(' = ', 1)[1]
        records.append(row)
    frame = pd.DataFrame(records).set_index('gsm')
    if len(frame) != 60 or frame.index.duplicated().any():
        raise ValueError('Expected 60 unique segments')
    sizes = frame.groupby(['sampleID', 'tissue', 'cell type']).size()
    if len(sizes) != 30 or not (sizes == 2).all():
        raise ValueError('Expected 30 groups of two segments')
    if set(frame['tissue']) != {'eutopic endometrium', 'endometriotic lesion'}:
        raise ValueError('Unexpected tissue')
    return frame

def parse_dcc(data):
    def section(tag):
        return data.split('<' + tag + '>', 1)[1].split('</' + tag + '>', 1)[0].strip()
    counts = dict(csv.reader(io.StringIO(section('Code_Summary'))))
    values = {k: float(v) for k, v in counts.items()}
    if any(not np.isfinite(v) or v < 0 for v in values.values()):
        raise ValueError('Invalid count')
    attrs = dict(csv.reader(io.StringIO(section('NGS_Processing_Attributes'))))
    attrs = {k: float(v) for k, v in attrs.items() if k != 'SeqSetId'}
    return values, attrs

def normalize(counts, quantile):
    counts = np.maximum(counts, 1)  # Explicit zero floor for exploratory normalization
    q = np.quantile(counts, quantile, axis=0)
    if np.any(q <= 0):
        raise ValueError('Zero normalizer')
    return np.log2(counts / (q / np.exp(np.mean(np.log(q)))) + 1)

def paired_deltas(log_counts, meta, compartment):
    # Collapse technical/spatial subsamples BEFORE donor-level differences.
    donors = sorted(meta['sampleID'].unique())
    result = []
    for donor in donors:
        base = (meta['sampleID'] == donor) & (meta['cell type'] == compartment)
        eu = np.flatnonzero(base & (meta['tissue'] == 'eutopic endometrium'))
        ec = np.flatnonzero(base & (meta['tissue'] == 'endometriotic lesion'))
        if len(eu) != 2 or len(ec) != 2:
            raise ValueError('Incomplete pair')
        result.append(log_counts[:, ec].mean(axis=1) - log_counts[:, eu].mean(axis=1))
    return np.column_stack(result), donors

def run(cache, out):
    cache.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name in FILES:
        path = cache / name
        if not path.exists():
            with urllib.request.urlopen(source_url(name), timeout=120) as response:
                path.write_bytes(response.read())
        data = path.read_bytes()
        manifest.append({'file': name, 'url': source_url(name), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    meta = metadata(gzip.decompress((cache / FILES[0]).read_bytes()).decode())
    pkc = json.loads(gzip.decompress((cache / FILES[2]).read_bytes()))
    targets = [t for t in pkc['Targets'] if t['CodeClass'].startswith('Endogenous')]
    if not all(len(t['Probes']) == 1 for t in targets):
        raise ValueError('This implementation requires one probe per endogenous target')
    genes = [t['DisplayName'] for t in targets]
    if len(set(genes)) != len(genes):
        raise ValueError('Duplicate target label')
    ids = [t['Probes'][0]['RTS_ID'] for t in targets]
    neg_ids = [p['RTS_ID'] for t in pkc['Targets'] if t['CodeClass'].startswith('Negative') for p in t['Probes']]
    arrays, negatives, technical = [], [], []
    with tarfile.open(cache / FILES[1]) as archive:
        names = set(archive.getnames())
        if names != set(meta['filename']):
            raise ValueError('Archive/metadata filename mismatch')
        for gsm, row in meta.iterrows():
            data = gzip.decompress(archive.extractfile(row['filename']).read()).decode()
            counts, attrs = parse_dcc(data)
            if not set(counts).issubset(set(ids + neg_ids)):
                raise ValueError('DCC/PKC probe mismatch')
            arrays.append([counts.get(p, 0) for p in ids])
            negatives.append([counts.get(p, 0) for p in neg_ids])
            attrs['gsm'] = gsm
            attrs['missing_probes_zero_filled'] = len(ids + neg_ids) - len(counts)
            attrs['aligned_fraction'] = attrs['Aligned'] / attrs['Raw']
            attrs['trimmed_fraction'] = attrs['Trimmed'] / attrs['Raw']
            attrs['stitched_fraction'] = attrs['Stitched'] / attrs['Raw']
            technical.append(attrs)
    counts = np.asarray(arrays).T
    neg = np.maximum(np.asarray(negatives).T, 1)
    loq = np.maximum(2, np.exp(np.log(neg).mean(axis=0) + 2 * np.log(neg).std(axis=0, ddof=1)))
    detection = counts >= loq
    qc = pd.DataFrame(technical).set_index('gsm')
    qc['negative_geomean'] = np.exp(np.log(neg).mean(axis=0))
    qc['loq_descriptive'] = loq
    qc['endogenous_detection_fraction'] = detection.mean(axis=0)
    qc['q3_raw'] = np.quantile(np.maximum(counts, 1), .75, axis=0)
    qc['QC_status'] = 'INCOMPLETE_NO_CONFIRMATORY_INFERENCE'
    meta.join(qc).to_csv(out / 'spatial_segment_audit.csv')
    q3 = normalize(counts, .75)
    med = normalize(counts, .5)
    frames, example_rows = [], []
    for compartment in sorted(meta['cell type'].unique()):
        delta, donors = paired_deltas(q3, meta, compartment)
        alt, _ = paired_deltas(med, meta, compartment)
        subset = meta['cell type'].eq(compartment).to_numpy()
        frame = pd.DataFrame({'gene': genes, 'compartment': compartment, 'n_donors': len(donors),
            'mean_delta_Q3': delta.mean(axis=1), 'mean_delta_median': alt.mean(axis=1),
            'positive_donors_Q3': (delta > 0).sum(axis=1), 'negative_donors_Q3': (delta < 0).sum(axis=1),
            'segments_above_LOQ': detection[:, subset].sum(axis=1), 'segments_total': int(subset.sum()),
            'normalization_direction_agrees': np.sign(delta.mean(axis=1)) == np.sign(alt.mean(axis=1)),
            'QC_status': 'INCOMPLETE_NO_CONFIRMATORY_INFERENCE'})
        for i, donor in enumerate(donors):
            frame['delta_Q3_donor_' + donor] = delta[:, i]
        frames.append(frame)
        example_rows.extend(frame[frame.gene.isin(['C3', 'C3AR1'])].to_dict('records'))
    atlas = pd.concat(frames, ignore_index=True)
    atlas.to_csv(out / 'spatial_compartment_atlas.csv.gz', index=False, float_format='%.8g')
    summary = {'accession': 'GSE263897', 'technology': 'GeoMx spatial segments, NOT single-cell',
        'donors': len(meta.sampleID.unique()), 'segments': len(meta), 'endogenous_targets': len(genes),
        'negative_probes': len(neg_ids), 'count_min_observed': float(counts.min()),
        'count_max_observed': float(counts.max()), 'QC_status': 'INCOMPLETE_NO_CONFIRMATORY_INFERENCE',
        'missing_QC': ['segment area', 'nuclei counts', 'deduplication/saturation', 'NTC', 'histological purity', 'author exclusion decisions'],
        'two_sided_exact_signflip_min_p': 2 / 2**len(meta.sampleID.unique()),
        'examples_previously_published_axis_NOT_discovery': example_rows,
        'technical_ranges': {c: [float(qc[c].min()), float(qc[c].max())] for c in qc.select_dtypes('number').columns},
        'source_manifest': manifest,
        'code_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'plan_sha256': hashlib.sha256(Path(__file__).with_name('SPATIAL_PILOT_PLAN.md').read_bytes()).hexdigest()}
    (out / 'spatial_pilot_summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    return summary

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, default=Path('endo_raw'))
    parser.add_argument('--out', type=Path, default=Path('endometriosis/results'))
    args = parser.parse_args()
    summary = run(args.cache, args.out)
    print(json.dumps({k: summary[k] for k in ['donors', 'segments', 'endogenous_targets', 'QC_status']}, indent=2))
