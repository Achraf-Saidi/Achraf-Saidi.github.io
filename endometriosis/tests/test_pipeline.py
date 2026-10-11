import csv
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np
from scipy import stats

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'research'))
from pipeline import bh, design_matrix, ols_hc3, analyze_counts, load_counts, meta
from simulate import synthetic_counts, pseudoreplication


class StatisticsTests(unittest.TestCase):
    def test_bh_against_scipy(self):
        p = np.random.default_rng(12).uniform(size=100)
        np.testing.assert_allclose(bh(p), stats.false_discovery_control(p), rtol=1e-12)

    def test_hc3_against_independent_reference(self):
        # Independent formula via per-observation outer products, not matrix meat.
        rng = np.random.default_rng(23)
        X = np.column_stack([np.ones(40), np.r_[np.zeros(20), np.ones(20)], rng.normal(size=40)])
        y = X @ np.array([2., .8, .2]) + rng.normal(size=40) * np.linspace(.5, 2, 40)
        fit = ols_hc3(X, y)
        inverse = np.linalg.inv(X.T @ X)
        beta = np.linalg.lstsq(X, y, rcond=None)[0]
        residual = y - X @ beta
        covariance = np.zeros((3, 3))
        for i, xi in enumerate(X):
            hi = xi @ inverse @ xi
            influence = inverse @ xi * residual[i] / (1 - hi)
            covariance += np.outer(influence, influence)
        self.assertAlmostEqual(fit['effect'], beta[1], places=12)
        self.assertAlmostEqual(fit['se'], np.sqrt(covariance[1, 1]), places=12)

    def test_confounded_design_refused(self):
        metadata = [dict(condition='case' if i < 6 else 'control',
                         batch='A' if i < 6 else 'B', phase='P', hormone='none') for i in range(12)]
        with self.assertRaisesRegex(ValueError, 'Non-identifiable'):
            design_matrix(metadata)

    def test_meta_analytic_and_overlap(self):
        def row(e, cohort):
            return dict(effect=e, se=2, cohort=cohort, effect_scale='x', contrast='c', cell_type='s')
        r = meta([row(1, 'a'), row(3, 'b')])
        self.assertEqual(r['effect'], 2)
        self.assertAlmostEqual(r['se'], np.sqrt(2))
        self.assertEqual(r['I2'], 0)
        with self.assertRaisesRegex(ValueError, 'Shared cohort'):
            meta([row(1, 'a'), row(3, 'a')])

    def test_random_effect_widens_heterogeneous_baseline(self):
        rows = [dict(effect=e, se=.1, cohort=str(i), effect_scale='x', contrast='c', cell_type='s')
                for i, e in enumerate([-.9, .1, 1.2])]
        self.assertGreater(meta(rows, True)['se'], meta(rows)['se'])

    def test_synthetic_pipeline_complete_and_reproducible(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'counts.csv'
            synthetic_counts(path)
            out, audit = analyze_counts(path)
            self.assertEqual(len(out), 120)
            self.assertEqual(len(audit), 3)
            self.assertTrue(all(r['n_case'] == 16 and r['n_control'] == 16 for r in out))
            self.assertTrue(all(0 <= r['q_value'] <= 1 for r in out))
            self.assertTrue(all(r['effect'] > 0 for r in out if r['gene'] == 'DEMO_000'))
            self.assertEqual(out, analyze_counts(path)[0])

    def test_incomplete_grid_and_invalid_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'counts.csv'
            synthetic_counts(path)
            with open(path) as handle:
                reader = csv.DictReader(handle)
                fields = reader.fieldnames
                rows = list(reader)
            with open(path, 'w', newline='') as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerows(rows[1:])
            with self.assertRaisesRegex(ValueError, 'Incomplete'):
                analyze_counts(path)
            rows[0]['count'] = '-1'
            with open(path, 'w', newline='') as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerows(rows)
            with self.assertRaisesRegex(ValueError, 'nonnegative'):
                load_counts(path)

    def test_pseudoreplication_known_pitfall(self):
        result = pseudoreplication(repetitions=100, seed=10)
        self.assertGreater(result['naive_cells']['false_positive_rate'], .4)
        self.assertLess(result['donor_means']['false_positive_rate'], .15)
        self.assertEqual(result, pseudoreplication(repetitions=100, seed=10))


if __name__ == '__main__':
    unittest.main()
