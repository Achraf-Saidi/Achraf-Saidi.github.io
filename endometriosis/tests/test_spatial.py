import sys, unittest
from pathlib import Path
import numpy as np
import pandas as pd
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'research'))
from spatial_pilot import paired_deltas, normalize, parse_dcc

class SpatialTests(unittest.TestCase):
    def test_segments_are_collapsed_before_pairing(self):
        meta = pd.DataFrame({'sampleID':['A']*4+['B']*4, 'cell type':['Stroma']*8,
                             'tissue':(['eutopic endometrium']*2+['endometriotic lesion']*2)*2})
        delta, donors = paired_deltas(np.array([[1,3,5,7,10,10,12,12]]), meta, 'Stroma')
        np.testing.assert_allclose(delta, [[4,2]])
        self.assertEqual(donors, ['A','B'])
        self.assertEqual(delta.shape[1], 2)
    def test_incomplete_pair_rejected(self):
        meta = pd.DataFrame({'sampleID':['A']*3,'cell type':['Stroma']*3,
                             'tissue':['eutopic endometrium','endometriotic lesion','endometriotic lesion']})
        with self.assertRaises(ValueError):paired_deltas(np.ones((1,3)),meta,'Stroma')
    def test_q3_removes_library_scaling(self):
        a=np.array([[2,20],[4,40],[8,80],[16,160]])
        norm=normalize(a,.75)
        np.testing.assert_allclose(norm[:,0],norm[:,1])
    def test_zero_floor_is_finite(self):
        self.assertTrue(np.isfinite(normalize(np.zeros((10,2)),.5)).all())
    def test_negative_count_rejected(self):
        d='<Code_Summary>\np,-1\n</Code_Summary>\n<NGS_Processing_Attributes>\nRaw,100\n</NGS_Processing_Attributes>'
        with self.assertRaises(ValueError):parse_dcc(d)
    def test_exact_resolution_five_donors(self):
        self.assertGreater(2/2**5,.05)

if __name__=='__main__':unittest.main()
