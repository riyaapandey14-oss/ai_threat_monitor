"""
Supervised detection model.

Swap point: the architecture doc specifies a lightweight hybrid CNN-LSTM
(per Rahmati 2025 / ELAI) for sequential + spatial pattern detection. That
requires a deep learning framework (PyTorch/TensorFlow) and sequence-shaped
input (sliding windows of events per entity). For this MVP we use a
Gradient Boosted Trees classifier, which:
  - trains and predicts in milliseconds on commodity CPU (no GPU needed),
  - gives well-calibrated probabilities usable directly as a risk signal,
  - is a drop-in interface (`.fit(X, y)`, `.predict_proba(X)`) so replacing
    it with a real CNN-LSTM (wrapped to expose the same two methods) is a
    localized change in `detection_engine.py` only.
"""

from sklearn.ensemble import GradientBoostingClassifier


class HybridDetector:
    def __init__(self, seed=42):
        self.model = GradientBoostingClassifier(
            n_estimators=150,
            max_depth=3,
            learning_rate=0.1,
            random_state=seed,
        )

    def fit(self, X, y):
        self.model.fit(X, y)
        return self

    def predict_proba(self, X):
        return self.model.predict_proba(X)[:, 1]
