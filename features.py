"""
Feature engineering layer.

Two responsibilities, matching the architecture doc:
  1. Static feature scaling (StandardScaler) fit once on historical/training data.
  2. Per-entity rolling behavioral baselining: each entity (host/user) keeps a
     short rolling window of recent activity; large deviation from an entity's
     OWN recent baseline is itself a strong signal, independent of the global
     population baseline.
"""

from collections import defaultdict, deque

import numpy as np
from sklearn.preprocessing import StandardScaler

from data.synthetic_data import FEATURE_NAMES

ROLLING_WINDOW = 20
ROLLING_FEATURES = ["packets_per_sec", "failed_logins", "unique_dest_ports"]


class FeatureEngineer:
    def __init__(self):
        self.scaler = StandardScaler()
        self._history = defaultdict(lambda: deque(maxlen=ROLLING_WINDOW))
        self._fitted = False

    def fit(self, X_df):
        self.scaler.fit(X_df[FEATURE_NAMES].values)
        self._fitted = True
        return self

    def transform_event(self, event: dict):
        """
        event: dict with FEATURE_NAMES + 'entity_id'
        returns: (scaled_static_vector, deviation_vector) both np.ndarray
        """
        assert self._fitted, "FeatureEngineer.fit() must be called before use"

        raw = np.array([event[f] for f in FEATURE_NAMES], dtype=float)
        scaled = self.scaler.transform(raw.reshape(1, -1))[0]

        entity = event["entity_id"]
        hist = self._history[entity]

        deviations = []
        for feat in ROLLING_FEATURES:
            val = event[feat]
            if len(hist) >= 3:
                past_vals = [h[feat] for h in hist]
                mean, std = np.mean(past_vals), np.std(past_vals) + 1e-6
                deviations.append((val - mean) / std)
            else:
                deviations.append(0.0)

        hist.append(event)
        return scaled, np.array(deviations)

    def transform_batch(self, event_list):
        scaled_list, dev_list = [], []
        for ev in event_list:
            s, d = self.transform_event(ev)
            scaled_list.append(s)
            dev_list.append(d)
        return np.vstack(scaled_list), np.vstack(dev_list)
