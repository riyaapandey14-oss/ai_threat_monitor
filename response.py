"""
Tiered response / orchestration layer (Section 6.6 of the documentation).

  low     -> log only
  medium  -> alert analyst with recommended action, no automatic containment
  high    -> propose automated containment, but require analyst confirmation
             before it actually executes (human-in-the-loop, per the
             SecurityWeek 2026 finding that human oversight remains
             necessary in the AI decision loop)
"""


class ResponseOrchestrator:
    def __init__(self):
        self.log = []

    def handle(self, event, risk_score, tier, rationale, entity_id):
        action = {
            "low": "logged",
            "medium": "analyst_alert",
            "high": "containment_pending_confirmation",
        }[tier]

        record = {
            "entity_id": entity_id,
            "risk_score": risk_score,
            "tier": tier,
            "action": action,
            "rationale": rationale,
        }
        self.log.append(record)
        return record

    def summary(self):
        counts = {"low": 0, "medium": 0, "high": 0}
        for r in self.log:
            counts[r["tier"]] += 1
        return counts

    def top_alerts(self, n=10):
        return sorted(self.log, key=lambda r: r["risk_score"], reverse=True)[:n]
