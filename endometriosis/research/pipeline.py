#!/usr/bin/env python3
"""Exploratory donor-level analysis. No target efficacy or causal inference.

Input is already aggregated RAW counts per gene, donor, cell type and study.
One homogeneous tissue/contrast per run; no repeated donor in a study/cell type.
See ../docs/METHODS.md before interpreting outputs.
"""
import argparse
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy import stats

REQUIRED = ['gene', 'study', 'cohort', 'donor', 'cell_type', 'condition',
            'count', 'tissue', 'phase', 'batch', 'hormone']


def bh(p):
    p = np.asarray(p, dtype=float)
    if not np.all(np.isfinite(p)) or np.any((p < 0) | (p > 1)):
        raise ValueError('Invalid p-values')
    order = np.argsort(p, kind='stable')
    adjusted = np.minimum.accumulate((p[order] * len(p) /
                                     np.arange(1, len(p) + 1))[::-1])[::-1]
    out = np.empty(len(p))
    out[order] = np.minimum(1, adjusted)
    return out


def design_matrix(metadata, covariates=('phase', 'batch', 'hormone')):
    groups = [r['condition'] for r in metadata]
    if set(groups) != {'case', 'control'}:
        raise ValueError('condition must be case or control, both present')
    if min(groups.count('case'), groups.count('control')) < 3:
        raise ValueError('At least 3 donors per group; practical power usually requires more')
    columns = [np.ones(len(metadata)), np.array([g == 'case' for g in groups], float)]
    names = ['intercept', 'case_minus_control']
    for covariate in covariates:
        values = [r[covariate] for r in metadata]
        levels = sorted(set(values))
        for level in levels[1:]:
            columns.append(np.array([v == level for v in values], float))
            names.append(f'{covariate}={level}')
    X = np.column_stack(columns)
    if np.linalg.matrix_rank(X) < X.shape[1]:
        raise ValueError('Non-identifiable design: disease and covariates are collinear')
    if X.shape[0] - X.shape[1] < 3:
        raise ValueError('At least 3 residual degrees of freedom required')
    return X, names


def ols_hc3(X, y):
    """HC3 sandwich with approximate t reference; not exact finite-sample inference."""
    bread = np.linalg.inv(X.T @ X)
    beta = bread @ X.T @ y
    residuals = y - X @ beta
    leverage = np.sum((X @ bread) * X, axis=1)
    if np.any(leverage >= 1 - 1e-10):
        raise ValueError('Unit leverage; HC3 undefined. More donors/design revision required')
    meat = X.T @ (X * (residuals / (1 - leverage))[:, None] ** 2)
    covariance = bread @ meat @ bread
    se = float(np.sqrt(max(0, covariance[1, 1])))
    if se <= 1e-12:
        raise ValueError('Degenerate residual variance; no valid standard error')
    df = X.shape[0] - X.shape[1]
    p = float(2 * stats.t.sf(abs(beta[1] / se), df))
    critical = float(stats.t.ppf(.975, df))
    return {'effect': float(beta[1]), 'se': se, 'p_value': p,
            'ci_low': float(beta[1] - critical * se),
            'ci_high': float(beta[1] + critical * se), 'df': df}


def load_counts(path):
    with open(path, newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or len(set(reader.fieldnames)) != len(reader.fieldnames):
            raise ValueError('Missing or duplicate headers')
        missing = set(REQUIRED) - set(reader.fieldnames)
        if missing:
            raise ValueError(f'Missing columns: {sorted(missing)}')
        data = list(reader)
    if not data:
        raise ValueError('No counts')
    groups = defaultdict(list)
    seen = set()
    donor_meta = {}
    for i, r in enumerate(data, 2):
        if any(not str(r.get(k, '')).strip() for k in REQUIRED):
            raise ValueError(f'Row {i}: empty required field')
        if r['condition'] not in ('case', 'control'):
            raise ValueError(f'Row {i}: condition must be case/control')
        try:
            c = float(r['count'])
        except ValueError as error:
            raise ValueError(f'Row {i}: non-numeric count') from error
        if not np.isfinite(c) or c < 0 or c != int(c):
            raise ValueError(f'Row {i}: counts must be nonnegative integers')
        r['count'] = int(c)
        key = (r['study'], r['cell_type'], r['donor'], r['gene'])
        if key in seen:
            raise ValueError(f'Row {i}: duplicate aggregated count')
        seen.add(key)
        dkey = (r['study'], r['donor'])
        meta = tuple(r[k] for k in ('cohort', 'condition', 'tissue', 'phase', 'batch', 'hormone'))
        if dkey in donor_meta and donor_meta[dkey] != meta:
            raise ValueError(f'Row {i}: inconsistent or repeated donor metadata')
        donor_meta[dkey] = meta
        groups[(r['study'], r['cell_type'])].append(r)
    # Conservative: mixed tissues need explicit separate analyses, not pooled contrasts.
    if len({r['tissue'] for r in data}) != 1:
        raise ValueError('Mixed tissues: split input into a homogeneous tissue contrast')
    return groups


def analyze_counts(path, min_total=10):
    if min_total < 0:
        raise ValueError('min_total must be nonnegative')
    output, audit = [], []
    for (study, cell_type), rows in sorted(load_counts(path).items()):
        genes = sorted({r['gene'] for r in rows})
        donors = sorted({r['donor'] for r in rows})
        lookup = {(r['donor'], r['gene']): r['count'] for r in rows}
        if len(lookup) != len(genes) * len(donors):
            raise ValueError('Incomplete donor × gene grid: include explicit zero counts')
        metadata = [next(r for r in rows if r['donor'] == donor) for donor in donors]
        cohorts = {r['cohort'] for r in rows}
        if len(cohorts) != 1:
            raise ValueError('One cohort label per study required')
        counts = np.array([[lookup[(d, g)] for g in genes] for d in donors], float)
        library = counts.sum(axis=1)
        if np.any(library == 0):
            raise ValueError('Donor with zero library size')
        # Library uses full input universe before pre-specified count filtering.
        y = np.log2(1 + counts / library[:, None] * 1e6)
        X, names = design_matrix(metadata)
        family = []
        low_count = 0
        for j, gene in enumerate(genes):
            if counts[:, j].sum() < min_total:
                low_count += 1
                continue
            try:
                result = ols_hc3(X, y[:, j])
            except ValueError as error:
                # Do not silently change the testing universe by dropping failed fits.
                raise ValueError(f'{study}/{cell_type}/{gene}: {error}') from error
            family.append({'gene': gene, 'study': study, 'cohort': next(iter(cohorts)),
                           'cell_type': cell_type, **result,
                           'n_case': sum(r['condition'] == 'case' for r in metadata),
                           'n_control': sum(r['condition'] == 'control' for r in metadata),
                           'effect_scale': 'log2_CPM_difference',
                           'contrast': f"case_minus_control_in_{metadata[0]['tissue']}"})
        if not family:
            raise ValueError('No genes survive the pre-specified low-count filter')
        for r, q in zip(family, bh([r['p_value'] for r in family])):
            r['q_value'] = float(q)
        output.extend(family)
        audit.append({'study': study, 'cell_type': cell_type, 'donors': len(donors),
                      'design': names, 'genes_input': len(genes), 'genes_tested': len(family),
                      'low_count_excluded': low_count, 'min_total_count': min_total})
    return output, audit


def meta(rows, random_effect=False):
    """Normal-reference fixed effect or DerSimonian-Laird descriptive meta-analysis."""
    if not rows:
        raise ValueError('No study effects')
    if len({r['cohort'] for r in rows}) != len(rows):
        raise ValueError('Shared cohort labels: independent pooling refused')
    if len({(r['effect_scale'], r['contrast'], r['cell_type']) for r in rows}) != 1:
        raise ValueError('Incompatible effect scales, contrasts or cell types')
    e = np.array([r['effect'] for r in rows], float)
    se = np.array([r['se'] for r in rows], float)
    if not np.all(np.isfinite(e)) or not np.all(np.isfinite(se)) or np.any(se <= 0):
        raise ValueError('Invalid effects or standard errors')
    v = se ** 2
    w = 1 / v
    fixed = np.sum(w * e) / np.sum(w)
    Q = float(np.sum(w * (e - fixed) ** 2))
    denominator = np.sum(w) - np.sum(w ** 2) / np.sum(w)
    tau2 = max(0., (Q - len(e) + 1) / denominator) if denominator > 0 else 0.
    if random_effect:
        w = 1 / (v + tau2)
    effect = float(np.sum(w * e) / np.sum(w))
    pooled_se = float(np.sqrt(1 / np.sum(w)))
    return {'effect': effect, 'se': pooled_se, 'low': effect - 1.96 * pooled_se,
            'high': effect + 1.96 * pooled_se,
            'p_value': float(2 * stats.norm.sf(abs(effect / pooled_se))),
            'Q': Q, 'I2': max(0., (Q - len(e) + 1) / Q) if Q else 0.,
            'tau2': tau2, 'studies': len(rows),
            'model': 'DerSimonian-Laird' if random_effect else 'common-effect',
            'warning': 'Normal-reference interval; few-study coverage not guaranteed'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--counts', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--min-total', type=int, default=10)
    parser.add_argument('--data-status', choices=['synthetic', 'research'], required=True)
    args = parser.parse_args()
    rows, audit = analyze_counts(args.counts, args.min_total)
    args.output.mkdir(parents=True, exist_ok=True)
    with open(args.output / 'summary.csv', 'w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    (args.output / 'audit.json').write_text(json.dumps({
        'software': 'EndoScope 0.1.0', 'data_status': args.data_status,
        'input_sha256': hashlib.sha256(args.counts.read_bytes()).hexdigest(),
        'method': 'Donor log2(1+CPM) OLS with HC3; approximate t reference; BH by study/cell',
        'families': audit,
        'limitations': ['Exploratory; no causal or clinical inference',
                        'Independence and cohort overlap require external audit',
                        'Library-size normalization may be compositionally biased',
                        'Categorical covariates only; no age or continuous covariate adjustment',
                        'HC3 inference approximate; compare to established count-based methods',
                        'One homogeneous tissue per run; no paired/repeated-donor model']
    }, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(args.output), 'rows': len(rows), 'status': args.data_status}))


if __name__ == '__main__':
    main()
