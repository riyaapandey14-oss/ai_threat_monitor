"""
Explainability layer (Section 6.5 of the project documentation).

Uses SHAP (TreeExplainer, exact and fast for gradient-boosted trees) to
attribute the classifier's decision to specific features, so every flagged
event ships with a human-readable rationale instead of a bare score.
"""

import numpy as np
import shap

from data.synthetic_data import FEATURE_NAMES


class Explainer:
    def __init__(self, classifier_model):
        self.explainer = shap.TreeExplainer(classifier_model)

    def explain(self, scaled_feature_vector, top_k=3):
        """
        scaled_feature_vector: 1D np.ndarray, already scaled (same space the
        classifier was trained on).
        Returns a list of (feature_name, contribution) sorted by |contribution|.
        """
        sv = self.explainer.shap_values(scaled_feature_vector.reshape(1, -1))
        # sklearn GradientBoostingClassifier -> binary output, shap returns
        # a single array of shape (1, n_features) for the positive class.
        values = np.array(sv).reshape(-1)
        pairs = list(zip(FEATURE_NAMES, values))
        pairs.sort(key=lambda p: abs(p[1]), reverse=True)
        return pairs[:top_k]

    @staticmethod
    def to_rationale(pairs):
        parts = []
        for name, val in pairs:
            direction = "elevated" if val > 0 else "suppressed"
            parts.append(f"{name} {direction} risk (impact {val:+.2f})")
        return "; ".join(parts)
