"""
Lightweight explainability layer.

Uses the GradientBoostingClassifier's built-in feature_importances_
instead of SHAP, keeping the Explainable AI functionality while avoiding
SHAP/Numba/llvmlite/SciPy deployment dependencies.
"""

import numpy as np

from data.synthetic_data import FEATURE_NAMES


class Explainer:
    def __init__(self, classifier_model):
        self.model = classifier_model

    def explain(self, scaled_feature_vector, top_k=3):
        """
        Returns lightweight feature impacts based on the trained
        GradientBoostingClassifier feature importances.

        The signed impact is estimated from whether each feature's
        standardized value is above or below zero.
        """
        importances = np.asarray(self.model.feature_importances_)
        values = np.asarray(scaled_feature_vector).reshape(-1)

        impacts = importances * np.sign(values)

        pairs = list(zip(FEATURE_NAMES, impacts))
        pairs.sort(key=lambda p: abs(p[1]), reverse=True)

        return pairs[:top_k]

    @staticmethod
    def to_rationale(pairs):
        parts = []
        for name, val in pairs:
            direction = "elevated" if val > 0 else "suppressed"
            parts.append(f"{name} {direction} risk (impact {val:+.2f})")
        return "; ".join(parts)
