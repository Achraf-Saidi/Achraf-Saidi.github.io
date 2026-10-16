"""Achraf Notebooks · Iris classification, reproducible reference solution.
Source: sklearn load_iris (corrected Fisher/R version), see dataset metadata.
UCI Iris DOI 10.24432/C56C76, attribution R. A. Fisher (1936), CC BY 4.0 at UCI.
No dataset is redistributed here. Run: python projects/iris.py
"""
import json
import numpy as np
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.neighbors import NearestCentroid
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, confusion_matrix

def main():
    data = load_iris()
    X_train, X_test, y_train, y_test = train_test_split(
        data.data, data.target, test_size=0.3, random_state=42, stratify=data.target)
    # Fit scaling on TRAIN only. The pipeline repeats this discipline at prediction.
    model = make_pipeline(StandardScaler(), NearestCentroid())
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    baseline = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)
    # Independent construction of the same scaled class-centroid predictions.
    scaler = StandardScaler().fit(X_train)
    train, test = scaler.transform(X_train), scaler.transform(X_test)
    centers = np.array([train[y_train == label].mean(axis=0) for label in model[-1].classes_])
    manual = model[-1].classes_[np.argmin(((test[:, None, :] - centers[None, :, :])**2).sum(axis=2), axis=1)]
    assert np.array_equal(manual, predictions)
    assert len(X_train) == 105 and len(X_test) == 45
    result = {"n_train":105,"n_test":45,"seed":42,
        "baseline_accuracy":float(accuracy_score(y_test, baseline.predict(X_test))),
        "centroid_accuracy":float(accuracy_score(y_test,predictions)),
        "confusion_matrix":confusion_matrix(y_test,predictions).tolist()}
    print(json.dumps(result, indent=2))
    return result
if __name__ == "__main__": main()
