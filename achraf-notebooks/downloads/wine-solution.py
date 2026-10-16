"""Achraf Notebooks · Wine PCA on held-out data.
Source: sklearn load_wine. UCI Wine, DOI 10.24432/C5PC7J, CC BY 4.0 at UCI.
No dataset is redistributed. Run: python projects/wine.py
"""
import json
import numpy as np
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

def main():
    # Do not use cultivar labels to choose this unsupervised representation.
    data = load_wine()
    train, test = train_test_split(data.data, test_size=0.3, random_state=42)
    scaler = StandardScaler().fit(train)
    train_z, test_z = scaler.transform(train), scaler.transform(test)
    pca = PCA(n_components=2, svd_solver="full").fit(train_z)
    projected = pca.transform(test_z)
    reconstructed = pca.inverse_transform(projected)
    # Check orthogonality and reconstruction against an independent projection.
    assert np.allclose(pca.components_ @ pca.components_.T, np.eye(2), atol=1e-12)
    manual = (test_z - pca.mean_) @ pca.components_.T @ pca.components_ + pca.mean_
    assert np.allclose(reconstructed, manual, atol=1e-12)
    mse = float(np.mean((test_z-reconstructed)**2))
    # Null representation reconstructs everything by the TRAIN mean.
    baseline = float(np.mean((test_z-pca.mean_)**2))
    result = {"n_train":len(train),"n_test":len(test),"features":13,"seed":42,
        "train_explained_variance_ratio":pca.explained_variance_ratio_.tolist(),
        "test_reconstruction_mse_standardized":mse,
        "test_train_mean_reconstruction_mse":baseline}
    print(json.dumps(result, indent=2));return result
if __name__ == "__main__": main()
