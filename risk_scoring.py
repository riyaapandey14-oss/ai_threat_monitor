"""
Composite explainable risk scoring (Section 4.5 / 6.5 of the documentation).

Combines the three raw detection signals into a single 0-100 score so
analysts see one ranked queue instead of three separate alert streams --
directly targeting the alert-fatigue gap identified in the research.
"""

WEIGHTS = {
    "classifier_score": 0.55,   # supervised model, most directly trained on labels
    "ae_score": 0.30,           # unsupervised deviation from global normal behavior
    "deviation_score": 0.15,    # deviation from the entity's OWN recent baseline
}

# deviation_score is unbounded (roughly 0-5 in practice); normalize before weighting
DEVIATION_NORM = 5.0


def composite_risk_score(signals: dict) -> float:
    dev_norm = min(signals["deviation_score"] / DEVIATION_NORM, 1.0)
    raw = (
        WEIGHTS["classifier_score"] * signals["classifier_score"]
        + WEIGHTS["ae_score"] * signals["ae_score"]
        + WEIGHTS["deviation_score"] * dev_norm
    )
    return round(raw * 100, 1)


def risk_tier(score: float) -> str:
    if score >= 75:
        return "high"
    if score >= 40:
        return "medium"
    return "low"
