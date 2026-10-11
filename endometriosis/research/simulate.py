#!/usr/bin/env python3
"""Generate artificial counts and an honest donor-vs-cell pseudoreplication benchmark."""
import argparse
import csv
import json
from pathlib import Path
import numpy as np
from scipy import stats
from pipeline import REQUIRED


def synthetic_counts(path, seed=20261011):
    rng = np.random.default_rng(seed)
    rows = []
    genes = [f'DEMO_{i:03d}' for i in range(40)]
    for study in ['SYN_A', 'SYN_B', 'SYN_C']:
        for i in range(32):
            condition = 'case' if i >= 16 else 'control'
            # Alternating phase/batch is balanced in both groups, not confounded.
            means = np.full(40, 120.)
            if condition == 'case':
                means[:3] *= 2
                means[3:5] *= .5
            donor_factor = rng.lognormal(0, .2)
            # Poisson with donor/gene overdispersion via gamma multiplicative factors.
            means *= donor_factor * rng.gamma(8, 1 / 8, size=40)
            counts = rng.poisson(means)
            for gene, count in zip(genes, counts):
                rows.append(dict(gene=gene, study=study, cohort=study, donor=f'{study}_D{i:02d}',
                                 cell_type='synthetic_stroma', condition=condition,
                                 count=int(count), tissue='synthetic_tissue',
                                 phase='P1' if i % 2 else 'P2', batch='B1' if i % 4 < 2 else 'B2',
                                 hormone='none'))
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=REQUIRED)
        writer.writeheader()
        writer.writerows(rows)
    return {'data_status': 'synthetic', 'seed': seed, 'rows': len(rows),
            'truth': {'upregulated': genes[:3], 'downregulated': genes[3:5],
                      'null_absolute_expression': genes[5:]},
            'warning': 'CPM is compositional: absolute null genes may shift in relative abundance.'}


def pseudoreplication(repetitions=500, seed=20261011, donors=24, cells=40):
    """No treatment effect; intra-donor correlation induced by donor random intercept."""
    if repetitions < 20 or donors < 6 or donors % 2 or cells < 2:
        raise ValueError('Require repetitions>=20, even donors>=6 and cells>=2')
    rng = np.random.default_rng(seed)
    naive, donor = 0, 0
    for _ in range(repetitions):
        intercept = rng.normal(size=donors)
        values = intercept[:, None] + rng.normal(0, .5, size=(donors, cells))
        a, b = values[:donors // 2], values[donors // 2:]
        naive += stats.ttest_ind(a.ravel(), b.ravel(), equal_var=False).pvalue < .05
        donor += stats.ttest_ind(a.mean(axis=1), b.mean(axis=1), equal_var=False).pvalue < .05
    def result(k):
        # Wilson binomial interval for Monte Carlo precision, not clinical uncertainty.
        p = k / repetitions
        denom = 1 + 1.96 ** 2 / repetitions
        center = (p + 1.96 ** 2 / (2 * repetitions)) / denom
        half = 1.96 / denom * np.sqrt(p * (1 - p) / repetitions + 1.96 ** 2 / (4 * repetitions ** 2))
        return {'rejections': int(k), 'false_positive_rate': p,
                'monte_carlo_ci95': [float(center - half), float(center + half)]}
    return {'data_status': 'synthetic', 'seed': seed, 'repetitions': repetitions,
            'donors_total': donors, 'cells_per_donor': cells, 'true_group_effect': 0,
            'nominal_alpha': .05, 'naive_cells': result(naive), 'donor_means': result(donor),
            'interpretation': 'Demonstrates a known pseudoreplication pitfall in this generator only; no biological discovery.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('generated'))
    parser.add_argument('--repetitions', type=int, default=500)
    parser.add_argument('--seed', type=int, default=20261011)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = synthetic_counts(args.output / 'synthetic_counts.csv', args.seed)
    result = pseudoreplication(args.repetitions, args.seed)
    (args.output / 'synthetic_manifest.json').write_text(json.dumps(manifest, indent=2))
    (args.output / 'pseudoreplication.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
