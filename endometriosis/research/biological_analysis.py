#!/usr/bin/env python3
"""Anatomy-aware analysis of ORIGINAL public paired endometriosis cohorts.

Plan: BIOLOGICAL_ANALYSIS_PLAN.md. No therapeutic or causal claims.
Do not feed these cross-platform results into the common-effect browser meta-analysis.
"""
import argparse
import csv
import gzip
import hashlib
import io
import itertools
import json
import platform
import re
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import scipy
from scipy import stats

SOURCES = {
    'GSE105764_count.txt.gz': 'https://ftp.ncbi.nlm.nih.gov/geo/series/GSE105nnn/GSE105764/suppl/GSE105764_count.txt.gz',
    'GSE105764_family.soft.gz': 'https://ftp.ncbi.nlm.nih.gov/geo/series/GSE105nnn/GSE105764/soft/GSE105764_family.soft.gz',
    'GSE86534_family.soft.gz': 'https://ftp.ncbi.nlm.nih.gov/geo/series/GSE86nnn/GSE86534/soft/GSE86534_family.soft.gz',
    'GSE135485_family.soft.gz': 'https://ftp.ncbi.nlm.nih.gov/geo/series/GSE135nnn/GSE135485/soft/GSE135485_family.soft.gz',
    'hgnc_complete_set.txt': 'https://storage.googleapis.com/public-download-files/hgnc/tsv/tsv/hgnc_complete_set.txt',
}


def acquire(directory):
    directory.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, url in SOURCES.items():
        path = directory / name
        if not path.exists():
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read()
            if name.endswith('.gz'):
                gzip.decompress(data)  # Reject HTML masquerading as gzip.
            path.write_bytes(data)
        data = path.read_bytes()
        manifest.append({'file': name, 'url': url, 'bytes': len(data),
                         'sha256': hashlib.sha256(data).hexdigest()})
    return manifest


def symbol_maps(path):
    with open(path, newline='', encoding='utf-8') as handle:
        rows = [r for r in csv.DictReader(handle, delimiter='\t') if r['status'] == 'Approved']
    approved = {r['symbol'] for r in rows}
    aliases, ensembl = defaultdict(set), defaultdict(set)
    for r in rows:
        if r['ensembl_gene_id']:
            ensembl[r['ensembl_gene_id']].add(r['symbol'])
        for field in ('alias_symbol', 'prev_symbol'):
            for alias in r[field].split('|'):
                if alias:
                    aliases[alias].add(r['symbol'])
    aliases = {a: next(iter(v)) for a, v in aliases.items() if len(v) == 1}
    ensembl = {a: next(iter(v)) for a, v in ensembl.items() if len(v) == 1}

    def canonical(symbol):
        if symbol in approved:
            return symbol
        return aliases.get(symbol)
    return ensembl, canonical


def read_rna(directory, mapping):
    original = pd.read_csv(directory / 'GSE105764_count.txt.gz', sep='\t', index_col=0)
    if not original.index.is_unique or not original.columns.is_unique:
        raise ValueError('RNA duplicate gene/sample IDs')
    values = original.to_numpy(dtype=float)
    if not np.all(np.isfinite(values)) or np.any(values < 0) or np.any(values != np.floor(values)):
        raise ValueError('Expected finite nonnegative integer RNA counts')
    labels = list(original.columns)
    if not all(re.fullmatch(r'(EC|EU)\d+', c) for c in labels):
        raise ValueError('Unexpected matrix pair labels')
    ec = {c[2:]: c for c in labels if c.startswith('EC')}
    eu = {c[2:]: c for c in labels if c.startswith('EU')}
    if set(ec) != set(eu) or len(ec) != 8:
        raise ValueError('Expected exactly 8 complete RNA pairs')
    pairs = sorted(ec, key=int)
    library = original.sum(axis=0).to_numpy(dtype=float)
    if np.any(library <= 0):
        raise ValueError('Empty RNA library')
    # Library size includes unmapped and low-expressed genes.
    symbols = [mapping.get(str(g).split('.')[0]) for g in original.index]
    mapped = original.loc[[g is not None for g in symbols]].copy()
    mapped.index = [g for g in symbols if g is not None]
    counts = mapped.groupby(level=0, sort=True).sum()
    cpm = counts.to_numpy(dtype=float) / library[None, :] * 1e6
    keep = np.sum(cpm >= 1, axis=1) >= 8
    cpm, counts = cpm[keep], counts.loc[keep]
    primary = pd.DataFrame(np.log2(cpm + .5), index=counts.index, columns=labels)
    # Median-ratio alternative from the entire original gene universe.
    positive = np.all(values > 0, axis=1)
    if np.sum(positive) < 100:
        raise ValueError('Insufficient all-positive genes for median-ratio sensitivity')
    logv = np.log(values[positive])
    ratio = np.exp(logv - logv.mean(axis=1, keepdims=True))
    factors = np.median(ratio, axis=0)
    factors /= np.exp(np.mean(np.log(factors)))
    alt = pd.DataFrame(np.log2(counts.to_numpy(dtype=float) / factors[None, :] + .5),
                       index=counts.index, columns=labels)
    audit = {'accession': 'GSE105764', 'technology': 'bulk RNA-seq',
             'original_gene_rows': len(original), 'mapped_gene_rows': len(mapped),
             'canonical_genes_before_filter': len(mapped.groupby(level=0)),
             'genes_passing_expression_filter': len(counts), 'pairs': len(pairs),
             'pair_labels_from_matrix': pairs,
             'library_size': dict(zip(labels, map(int, library))),
             'median_ratio_size_factors': dict(zip(labels, map(float, factors))),
             'pairing_caveat': 'Matrix pair suffixes preserved; matrix-to-GSM crosswalk not available',
             'phase': 'Secretory in GEO overall design', 'treatment': 'No hormonal treatment history per GEO',
             'control': 'Eutopic endometrium of same affected donor; not healthy control'}
    return primary, alt, pairs, audit


def read_array(directory, canonical):
    text = gzip.open(directory / 'GSE86534_family.soft.gz', 'rt').read()
    platform_text = text.split('!platform_table_begin\n', 1)[1].split('!platform_table_end', 1)[0]
    annotations = {}
    total_probes, ambiguous = 0, 0
    for row in csv.DictReader(io.StringIO(platform_text.strip()), delimiter='\t'):
        total_probes += 1
        if row['ControlType'] != '0':
            continue
        symbol = canonical(row['GeneSymbol'])
        if symbol:
            annotations[row['ID']] = symbol
        else:
            ambiguous += 1
    samples, sample_audit = {}, []
    for block in text.split('^SAMPLE = ')[1:]:
        gsm = block.splitlines()[0].strip()
        title = re.search(r'^!Sample_title = (.+)$', block, re.M).group(1)
        match = re.fullmatch(r'Patient NO\.(\d+)_(ectopic endometrium|eutopic endometrium|lesion adjacent tissue)_rep1', title)
        if not match:
            raise ValueError(f'Unexpected array sample title: {title}')
        donor, tissue = match.groups()
        tissue_code = {'ectopic endometrium': 'EC', 'eutopic endometrium': 'EU',
                       'lesion adjacent tissue': 'NO'}[tissue]
        table = block.split('!sample_table_begin\n', 1)[1].split('!sample_table_end', 1)[0]
        values = {}
        for row in csv.DictReader(io.StringIO(table.strip()), delimiter='\t'):
            probe = row['ID_REF']
            if probe in annotations:
                v = float(row['VALUE'])
                if not np.isfinite(v):
                    raise ValueError('Non-finite array value')
                values[probe] = v
        key = tissue_code + donor
        if key in samples:
            raise ValueError('Repeated array donor/tissue')
        samples[key] = pd.Series(values)
        sample_audit.append({'gsm': gsm, 'donor': donor, 'tissue': tissue_code,
                             'original_tissue_label': tissue, 'original_title': title})
    frame = pd.DataFrame(samples)
    if frame.isna().any().any():
        raise ValueError('Incomplete annotated array probe grid')
    frame.index = [annotations[probe] for probe in frame.index]
    primary = frame.groupby(level=0, sort=True).median()
    alt = frame.groupby(level=0, sort=True).mean()
    pairs = sorted({r['donor'] for r in sample_audit}, key=int)
    if len(pairs) != 4 or len(samples) != 12:
        raise ValueError('Expected exactly 4 array donors × 3 tissues')
    audit = {'accession': 'GSE86534', 'technology': 'Agilent microarray, NOT RNA-seq',
             'platform': 'GPL20115', 'pairs': len(pairs), 'sample_metadata': sample_audit,
             'platform_probes': total_probes, 'mapped_noncontrol_probes': len(annotations),
             'unmapped_or_ambiguous_noncontrol_probes': ambiguous,
             'canonical_genes': len(primary), 'processed_scale_range': [float(frame.values.min()), float(frame.values.max())],
             'scale': 'Supplied processed VALUE (log2-like range); no second logarithm applied',
             'anatomical_control': 'Lesion-adjacent ovarian tissue from affected donors; not healthy-person ovary',
             'cycle_phase': 'Not resolved by downloaded sample metadata',
             'treatment': 'Not resolved by downloaded sample metadata'}
    return primary, alt, pairs, audit


def paired_summary(differences):
    """Gene × independent donor differences. t-reference and exact sign symmetry sensitivity."""
    d = np.asarray(differences, dtype=float)
    if d.ndim != 2 or d.shape[1] < 3 or not np.all(np.isfinite(d)):
        raise ValueError('Require finite gene × donor differences with n>=3')
    n = d.shape[1]
    effect = d.mean(axis=1)
    se = d.std(axis=1, ddof=1) / np.sqrt(n)
    t = np.divide(effect, se, out=np.zeros_like(effect), where=se > 1e-12)
    right = stats.t.sf(t, n - 1)
    left = stats.t.cdf(t, n - 1)
    # Degenerate nonzero effects cannot receive p=0 through division by zero.
    right[se <= 1e-12] = .5
    left[se <= 1e-12] = .5
    signs = np.array(list(itertools.product([-1., 1.], repeat=n)))
    permutations = d @ signs.T / n
    tolerance = 1e-10 * np.maximum(1, np.abs(effect))[:, None]
    exact_right = np.mean(permutations >= effect[:, None] - tolerance, axis=1)
    exact_left = np.mean(permutations <= effect[:, None] + tolerance, axis=1)
    loo = (d.sum(axis=1, keepdims=True) - d) / (n - 1)
    critical = stats.t.ppf(.975, n - 1)
    return {'effect': effect, 'se': se, 'low': effect - critical * se,
            'high': effect + critical * se, 'p': np.minimum(1, 2 * np.minimum(right, left)),
            'right': right, 'left': left, 'exact_right': exact_right, 'exact_left': exact_left,
            'p_exact': np.minimum(1, 2 * np.minimum(exact_right, exact_left)),
            'loo_same_sign': np.all(np.sign(loo) == np.sign(effect)[:, None], axis=1) & (effect != 0),
            'donors_same_sign': np.sum(np.sign(d) == np.sign(effect)[:, None], axis=1),
            'degenerate': se <= 1e-12, 'n': n}


def directional_conjunction(summaries, exact=False):
    right_key, left_key = ('exact_right', 'exact_left') if exact else ('right', 'left')
    up = np.max([s[right_key] for s in summaries], axis=0)
    down = np.max([s[left_key] for s in summaries], axis=0)
    # Bonferroni across testing up and down; valid all-required-contrasts PC test.
    return np.minimum(1, 2 * np.minimum(up, down))


def differences(frame, donors, first='EC', second='EU'):
    return frame[[first + d for d in donors]].values - frame[[second + d for d in donors]].values


def analyze(directory, output):
    manifest = acquire(directory)
    ensembl, canonical = symbol_maps(directory / 'hgnc_complete_set.txt')
    rna, rna_alt, rna_donors, rna_audit = read_rna(directory, ensembl)
    array, array_alt, array_donors, array_audit = read_array(directory, canonical)
    genes = sorted(set(rna.index) & set(array.index))
    if len(genes) < 1000:
        raise ValueError('Unexpectedly small common gene universe')
    rna, rna_alt, array, array_alt = [f.loc[genes] for f in (rna, rna_alt, array, array_alt)]
    ds = {'rna_EC_EU': differences(rna, rna_donors),
          'array_EC_EU': differences(array, array_donors),
          'array_EC_NO': differences(array, array_donors, second='NO'),
          'array_NO_EU': differences(array, array_donors, first='NO')}
    summaries = {k: paired_summary(v) for k, v in ds.items()}
    alt_rna = differences(rna_alt, rna_donors).mean(axis=1)
    alt_array = differences(array_alt, array_donors).mean(axis=1)
    a, b, c = [summaries[k] for k in ('rna_EC_EU', 'array_EC_EU', 'array_EC_NO')]
    table = pd.DataFrame(index=pd.Index(genes, name='gene'))
    for contrast, result in summaries.items():
        for key in ('effect', 'se', 'low', 'high', 'p', 'p_exact', 'loo_same_sign', 'donors_same_sign', 'degenerate'):
            table[contrast + '_' + key] = result[key]
        table[contrast + '_q_BH'] = stats.false_discovery_control(result['p'], method='bh')
        table[contrast + '_q_BY'] = stats.false_discovery_control(result['p'], method='by')
    table['rna_alternative_normalisation_effect'] = alt_rna
    table['array_alternative_probe_collapse_effect'] = alt_array
    table['normalisation_sign_stable'] = np.sign(a['effect']) == np.sign(alt_rna)
    table['probe_collapse_sign_stable'] = np.sign(b['effect']) == np.sign(alt_array)
    table['direction_concordant_two_cohorts'] = np.sign(a['effect']) == np.sign(b['effect'])
    table['direction_concordant_anatomy'] = table['direction_concordant_two_cohorts'] & (np.sign(a['effect']) == np.sign(c['effect']))
    for name, results in [('replication', [a, b]), ('anatomy_conjunction', [a, b, c])]:
        p, pe = directional_conjunction(results), directional_conjunction(results, exact=True)
        table[name + '_p_t_model'] = p
        table[name + '_q_BH_t_model'] = stats.false_discovery_control(p, method='bh')
        table[name + '_q_BY_t_model'] = stats.false_discovery_control(p, method='by')
        table[name + '_p_signflip'] = pe
        table[name + '_q_BY_signflip'] = stats.false_discovery_control(pe, method='by')
    # Label model-dependent evidence, not candidates proven effective.
    table['replication_t_model_BH05'] = table.replication_q_BH_t_model <= .05
    table['anatomy_t_model_BH05'] = table.anatomy_conjunction_q_BH_t_model <= .05
    table['all_three_loo_sign_stable'] = a['loo_same_sign'] & b['loo_same_sign'] & c['loo_same_sign']
    table['descriptive_priority'] = (table.anatomy_t_model_BH05 & table.all_three_loo_sign_stable &
                                     table.normalisation_sign_stable & table.probe_collapse_sign_stable)
    table = table.sort_values(['descriptive_priority', 'anatomy_conjunction_q_BH_t_model',
                              'anatomy_conjunction_p_t_model', 'replication_p_t_model'],
                             ascending=[False, True, True, True])
    counts = {'common_genes_tested': len(genes), 'rna_pairs': len(rna_donors), 'array_pairs': len(array_donors),
              'concordant_direction': int(table.direction_concordant_two_cohorts.sum()),
              'replication_t_model_BH05': int(table.replication_t_model_BH05.sum()),
              'replication_t_model_BY05': int((table.replication_q_BY_t_model <= .05).sum()),
              'anatomy_t_model_BH05': int(table.anatomy_t_model_BH05.sum()),
              'anatomy_t_model_BY05': int((table.anatomy_conjunction_q_BY_t_model <= .05).sum()),
              'replication_signflip_BY05': int((table.replication_q_BY_signflip <= .05).sum()),
              'anatomy_signflip_BY05': int((table.anatomy_conjunction_q_BY_signflip <= .05).sum()),
              'descriptive_priority': int(table.descriptive_priority.sum()),
              'exact_directional_replication_p_min': float(table.replication_p_signflip.min()),
              'paired_delta_spearman_crossplatform': float(stats.spearmanr(a['effect'], b['effect']).statistic),
              'array_lesionEU_vs_adjacentovaryEU_spearman': float(stats.spearmanr(
                  b['effect'], summaries['array_NO_EU']['effect']).statistic),
              'RNA_singlecohort_BH05': int((table.rna_EC_EU_q_BH <= .05).sum()),
              'array_singlecohort_BH05': int((table.array_EC_EU_q_BH <= .05).sum()),
              'array_anatomy_singlecontrast_BH05': int((table.array_EC_NO_q_BH <= .05).sum())}
    report = {'status': 'REAL public-data secondary reanalysis; exploratory, not preregistered',
              'created_utc': datetime.now(timezone.utc).isoformat(),
              'question': 'Replicated ovarian lesion vs eutopic signatures with adjacent ovarian tissue control',
              'counts': counts, 'cohorts': [rna_audit, array_audit],
              'excluded': [{'accession': 'GSE135485', 'reason': 'Downloaded metadata lacks per-sample donor/tissue resolution; no guessed pairing'}],
              'normalisation': {'RNA_primary': 'log2(full-library CPM + 0.5)',
                                'RNA_sensitivity': 'median-ratio factors, log2(normalised counts + 0.5)',
                                'array_primary': 'supplied processed VALUE, canonical gene median',
                                'array_sensitivity': 'canonical gene mean'},
              'statistical_claim': 't-reference results are model-dependent; exact sign-flip sensitivity cannot yield 5% replicated genes with 4 validation donors',
              'not_claimed': ['cure', 'clinical efficacy', 'causal target', 'disease-vs-healthy biomarker', 'novel methodology'],
              'limitations': ['Small n; one cohort has 4 donors only', 'Bulk tissue composition and organ/site confounding',
                              'Adjacent ovary may have a disease field effect and is not a healthy-person control',
                              'Secretory untreated discovery cohort; array phase/treatment not resolved in sample metadata',
                              'Independence inferred from different original studies/institutions, not direct donor identity matching',
                              't-reference assumes independent approximately normal donor differences',
                              'Sign-flip sensitivity assumes sign symmetry; it is not a randomised causal experiment',
                              'No batch, age or continuous cycle adjustment beyond within-donor matching',
                              'Processed array VALUE scale not fully reconstructed from raw images',
                              'Current HGNC mapping may omit retired or ambiguous genes'],
              'top_descriptive_signals': table.head(25).reset_index().to_dict(orient='records'),
              'manifest': manifest,
              'plan_sha256': hashlib.sha256(Path(__file__).with_name('BIOLOGICAL_ANALYSIS_PLAN.md').read_bytes()).hexdigest(),
              'code_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'environment': {'python': platform.python_version(), 'numpy': np.__version__, 'pandas': pd.__version__, 'scipy': scipy.__version__}}
    output.mkdir(parents=True, exist_ok=True)
    table.to_csv(output / 'all_genes.csv.gz', compression={'method': 'gzip', 'mtime': 0}, float_format='%.9g')
    table.head(100).to_csv(output / 'top100_descriptive.csv', float_format='%.9g')
    (output / 'biological_results.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    (output / 'acquisition_manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    # Entire paired matrices of DELTAS for rechecking statistics, without clinical identities.
    for name, d in ds.items():
        donor_labels = rna_donors if name.startswith('rna') else array_donors
        pd.DataFrame(d, index=pd.Index(genes, name='gene'), columns=['source_pair_' + x for x in donor_labels]).to_csv(
            output / (name + '_paired_deltas.csv.gz'), compression={'method': 'gzip', 'mtime': 0}, float_format='%.12g')
    print(json.dumps(counts, indent=2))
    print(table.head(12)[['rna_EC_EU_effect', 'array_EC_EU_effect', 'array_EC_NO_effect',
                          'replication_q_BH_t_model', 'anatomy_conjunction_q_BH_t_model',
                          'replication_p_signflip', 'descriptive_priority']].to_string())
    return report, table


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    analyze(args.data, args.output)


if __name__ == '__main__':
    main()
