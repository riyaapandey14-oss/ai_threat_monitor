"""
Data ingestion layer.

StreamIngestor exposes the minimal interface a Kafka/Kinesis consumer would
provide (`poll()` yielding batches of raw events). Swapping the synthetic
generator for a real `kafka-python` / `boto3` Kinesis client only requires
replacing `_source()` -- nothing downstream changes.
"""

from collections import deque
from data.synthetic_data import generate_dataset, event_stream


class StreamIngestor:
    def __init__(self, batch_size=32, seed=42):
        self.batch_size = batch_size
        X, y, attack_type = generate_dataset(seed=seed)
        self._buffer = deque(event_stream(X, y, attack_type))
        self.total_events = len(self._buffer)

    def poll(self):
        """Return up to `batch_size` (event_dict, true_label, true_type) tuples."""
        batch = []
        for _ in range(min(self.batch_size, len(self._buffer))):
            batch.append(self._buffer.popleft())
        return batch

    def has_more(self):
        return len(self._buffer) > 0
