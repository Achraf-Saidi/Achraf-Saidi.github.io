import sys
import unittest
from pathlib import Path
import numpy as np
from scipy import stats

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'research'))
from biological_analysis import paired_summary, directional_conjunction, differences


class BiologicalAnalysisTests(unittest.TestCase):
    def test_paired_test_matches_scipy(self):
        d = np.random.default_rng(10).normal(size=(20, 8)) + .3
        result = paired_summary(d)
        reference = stats.ttest_1samp(d, 0, axis=1)
        np.testing.assert_allclose(result['p'], reference.pvalue, rtol=1e-12)
        np.testing.assert_allclose(result['effect'], d.mean(axis=1), rtol=1e-12)

    def test_four_donor_resolution(self):
        result = paired_summary(np.array([[1., 2., 3., 4.]]))
        self.assertEqual(result['exact_right'][0], 1 / 16)
        self.assertEqual(result['p_exact'][0], .125)
        self.assertEqual(directional_conjunction([result, result], exact=True)[0], .125)

    def test_direction_disagreement_abstains(self):
        a = paired_summary(np.array([[1., 1.2, 1.1, 1.3]]))
        b = paired_summary(np.array([[-1., -1.2, -1.1, -1.3]]))
        self.assertEqual(directional_conjunction([a, b])[0], 1.)

    def test_degenerate_is_not_p_zero(self):
        result = paired_summary(np.array([[2., 2., 2., 2.], [0., 0., 0., 0.]]))
        np.testing.assert_array_equal(result['p'], [1., 1.])
        np.testing.assert_array_equal(result['degenerate'], [True, True])

    def test_zero_null_ties_counted(self):
        result = paired_summary(np.zeros((1, 8)))
        self.assertEqual(result['exact_right'][0], 1.)
        self.assertEqual(result['exact_left'][0], 1.)
        self.assertEqual(result['p_exact'][0], 1.)

    def test_directional_conjunction_null_control(self):
        rng = np.random.default_rng(84)
        # One required contrast is true null; the other two have arbitrarily large effects.
        null = paired_summary(rng.normal(size=(8000, 8)))
        signal = paired_summary(rng.normal(5., 1., size=(8000, 8)))
        p = directional_conjunction([null, signal, signal])
        self.assertLess(np.mean(p <= .05), .065)

    def test_exact_p_values_are_on_enumerated_grid(self):
        d = np.random.default_rng(32).normal(size=(30, 4))
        result = paired_summary(d)
        np.testing.assert_allclose(result['exact_right'] * 16, np.round(result['exact_right'] * 16))

    def test_loo_sign_can_detect_influential_donor(self):
        result = paired_summary(np.array([[10., -1., -1., -1.], [1., 2., 3., 4.]]))
        np.testing.assert_array_equal(result['loo_same_sign'], [False, True])


if __name__ == '__main__':
    unittest.main()
