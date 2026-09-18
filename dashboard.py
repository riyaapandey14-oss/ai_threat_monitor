"""
Minimal MVP dashboard: renders a static PNG summary from the alert log so
the pipeline's output is reviewable without standing up a web server.

Swap point: replace with a Grafana dashboard reading from the time-series
DB, or a lightweight Streamlit app, per Section 6.7 of the documentation.

Run after pipeline.py: python dashboard.py
"""

import json

import matplotlib.pyplot as plt


def load_log(path="outputs/alert_log.json"):
    with open(path) as f:
        return json.load(f)


def render(log, out_path="outputs/dashboard.png"):
    scores = [r["risk_score"] for r in log]
    tiers = [r["tier"] for r in log]
    tier_counts = {t: tiers.count(t) for t in ["low", "medium", "high"]}

    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

    axes[0].hist(scores, bins=25, color="#185FA5", edgecolor="white")
    axes[0].set_title("Composite risk score distribution")
    axes[0].set_xlabel("Risk score (0-100)")
    axes[0].set_ylabel("Event count")

    colors = {"low": "#639922", "medium": "#BA7517", "high": "#A32D2D"}
    axes[1].bar(tier_counts.keys(), tier_counts.values(),
                color=[colors[t] for t in tier_counts])
    axes[1].set_title("Alerts by response tier")
    axes[1].set_ylabel("Count")

    fig.suptitle("AI threat monitoring - run summary", fontsize=13)
    fig.tight_layout()
    fig.savefig(out_path, dpi=140)
    print(f"Dashboard saved to {out_path}")


if __name__ == "__main__":
    render(load_log())
