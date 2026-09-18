"""
Unsupervised behavioral baseliner.

Implemented as a bottlenecked MLPRegressor trained to reconstruct its own
input (the classic autoencoder trick), trained ONLY on normal traffic.
Reconstruction error on new events approximates how far they are from
learned normal behavior -- this is the unsupervised half of the ensemble
described in the architecture doc, and requires no attack labels to train.

Swap point: in production this can be replaced by a small PyTorch/TensorFlow
autoencoder (e.g. 10 -> 6 -> 3 -> 6 -> 10) exported to ONNX for edge
deployment, per the ELAI-style lightweight design target (<50MB, single
digit ms inference). The sklearn version here keeps the MVP dependency-light
while preserving the exact same interface.
"""

import numpy as np
from sklearn.neural_network import MLPRegressor


class BehaviorAutoencoder:
    def __init__(self, n_features, hidden=(6, 3, 6), seed=42):
        self.model = MLPRegressor(
            hidden_layer_sizes=hidden,
            activation="tanh",
            max_iter=800,
            random_state=seed,
            early_stopping=True,
            n_iter_no_change=15,
        )
        self._error_scale = 1.0

    def fit(self, X_normal):
        self.model.fit(X_normal, X_normal)
        recon = self.model.predict(X_normal)
        errors = np.mean((X_normal - recon) ** 2, axis=1)
        # 95th percentile of normal reconstruction error sets the scale
        # so downstream scores are roughly comparable across runs.
        self._error_scale = max(np.percentile(errors, 95), 1e-6)
        return self

    def reconstruction_error(self, X):
        recon = self.model.predict(X)
        return np.mean((X - recon) ** 2, axis=1)

    def anomaly_score(self, X):
        """0-1 score; ~1.0 sits at the 95th percentile normal error."""
        err = self.reconstruction_error(X)
        return np.clip(err / self._error_scale, 0, 3) / 3
