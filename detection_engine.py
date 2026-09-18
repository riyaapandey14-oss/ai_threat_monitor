"""
Detection engine: ensembles the supervised classifier, the unsupervised
autoencoder baseliner, and per-entity behavioral deviation into a single
per-event anomaly signal set. This mirrors the "detection engine" stage of
the pipeline architecture (Section 6.4 of the project documentation).

Cross-signal graph correlation (Section 4.1 of the documentation) is a
Phase-3 feature and is intentionally out of scope for this MVP; the
ensemble here covers the two model families available without a deep
learning framework, plus the behavioral-deviation signal from the feature
engineering layer.
"""

import numpy as np

from features import FeatureEngineer
from models.autoencoder import BehaviorAutoencoder
from models.classifier import HybridDetector


class DetectionEngine:
    def __init__(self):
        self.fe = FeatureEngineer()
        self.autoencoder = None
        self.classifier = HybridDetector()
        self._n_features = None

    def train(self, X_df, y):
        self.fe.fit(X_df)
        X_scaled = self.fe.scaler.transform(X_df.values)
        self._n_features = X_scaled.shape[1]

        # Autoencoder trains only on normal traffic (unsupervised baselining)
        self.autoencoder = BehaviorAutoencoder(n_features=self._n_features)
        self.autoencoder.fit(X_scaled[y == 0])

        # Supervised classifier trains on the full labeled set
        self.classifier.fit(X_scaled, y)
        return self

    def score_event(self, event: dict):
        """
        Returns a dict of raw signals for one event:
          classifier_score:  P(attack) from the supervised model, 0-1
          ae_score:           reconstruction-error anomaly score, 0-1
          deviation_score:    magnitude of deviation from the entity's own
                               recent behavior, unbounded but typically 0-5
          scaled_features:    the standardized feature vector (for SHAP)
        """
        scaled, deviations = self.fe.transform_event(event)
        classifier_score = float(self.classifier.predict_proba(scaled.reshape(1, -1))[0])
        ae_score = float(self.autoencoder.anomaly_score(scaled.reshape(1, -1))[0])
        deviation_score = float(np.linalg.norm(deviations))

        return {
            "classifier_score": classifier_score,
            "ae_score": ae_score,
            "deviation_score": deviation_score,
            "scaled_features": scaled,
        }
