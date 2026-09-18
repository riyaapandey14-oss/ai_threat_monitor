"""
Synthetic network/endpoint telemetry generator.

In production this module is replaced by real ingestion (Kafka / Kinesis
consumers reading NetFlow, EDR, auth, and cloud-audit events). For the MVP
we generate labeled synthetic events so the full pipeline (features ->
detection -> explainability -> risk scoring -> response) can be exercised
end-to-end without external data dependencies.

Each event represents one aggregated connection/session record with the
kind of fields a real flow collector or EDR agent would emit.
"""

import numpy as np
import pandas as pd

FEATURE_NAMES = [
    "duration",            # connection duration (s)
    "packet_size_avg",     # average packet size (bytes)
    "packets_per_sec",     # packet rate
    "bytes_sent",
    "bytes_received",
    "unique_dest_ports",   # distinct destination ports contacted
    "failed_logins",       # failed auth attempts in window
    "new_process_count",   # new processes spawned by the entity
    "dest_entropy",        # entropy of destination IPs contacted (scan-like behavior)
    "protocol_rareness",   # how unusual the protocol is for this entity (0-1)
]


def _normal_batch(n, rng):
    return pd.DataFrame({
        "duration": rng.gamma(2.0, 1.5, n),
        "packet_size_avg": rng.normal(500, 80, n).clip(40, 1500),
        "packets_per_sec": rng.gamma(2.0, 5.0, n),
        "bytes_sent": rng.gamma(3.0, 400, n),
        "bytes_received": rng.gamma(3.0, 600, n),
        "unique_dest_ports": rng.poisson(2, n),
        "failed_logins": rng.poisson(0.05, n),
        "new_process_count": rng.poisson(0.3, n),
        "dest_entropy": rng.normal(0.3, 0.1, n).clip(0, 1),
        "protocol_rareness": rng.beta(1, 8, n),
    })


def _port_scan_batch(n, rng):
    df = _normal_batch(n, rng)
    df["unique_dest_ports"] = rng.poisson(60, n)
    df["dest_entropy"] = rng.normal(0.85, 0.05, n).clip(0, 1)
    df["packets_per_sec"] = rng.gamma(6.0, 8.0, n)
    df["duration"] = rng.gamma(1.0, 0.4, n)
    return df


def _brute_force_batch(n, rng):
    df = _normal_batch(n, rng)
    df["failed_logins"] = rng.poisson(15, n)
    df["duration"] = rng.gamma(1.0, 0.8, n)
    df["unique_dest_ports"] = rng.poisson(1, n)
    return df


def _data_exfiltration_batch(n, rng):
    df = _normal_batch(n, rng)
    df["bytes_sent"] = rng.gamma(8.0, 2500, n)
    df["duration"] = rng.gamma(4.0, 3.0, n)
    df["protocol_rareness"] = rng.beta(6, 2, n)
    return df


def _lateral_movement_batch(n, rng):
    df = _normal_batch(n, rng)
    df["new_process_count"] = rng.poisson(6, n)
    df["unique_dest_ports"] = rng.poisson(8, n)
    df["failed_logins"] = rng.poisson(2, n)
    df["protocol_rareness"] = rng.beta(4, 4, n)
    return df


ATTACK_GENERATORS = {
    "port_scan": _port_scan_batch,
    "brute_force": _brute_force_batch,
    "data_exfiltration": _data_exfiltration_batch,
    "lateral_movement": _lateral_movement_batch,
}


def generate_dataset(n_normal=6000, n_attacks_each=300, seed=42):
    """Returns (X: DataFrame[FEATURE_NAMES], y: 0/1 label, attack_type: str)."""
    rng = np.random.default_rng(seed)

    frames, labels, types = [], [], []

    normal = _normal_batch(n_normal, rng)
    frames.append(normal)
    labels += [0] * n_normal
    types += ["normal"] * n_normal

    for name, gen in ATTACK_GENERATORS.items():
        batch = gen(n_attacks_each, rng)
        frames.append(batch)
        labels += [1] * n_attacks_each
        types += [name] * n_attacks_each

    X = pd.concat(frames, ignore_index=True)[FEATURE_NAMES]
    y = np.array(labels)
    attack_type = np.array(types)

    # shuffle to simulate an interleaved real-time stream
    idx = rng.permutation(len(X))
    return X.iloc[idx].reset_index(drop=True), y[idx], attack_type[idx]


def event_stream(X, y, attack_type):
    """Yields one event at a time as a dict, simulating a live stream."""
    for i in range(len(X)):
        row = X.iloc[i].to_dict()
        row["entity_id"] = f"host-{i % 40:03d}"
        yield row, int(y[i]), str(attack_type[i])
