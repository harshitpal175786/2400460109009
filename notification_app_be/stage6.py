"""
Stage 6: Top 10 notification ranking with an O(n log 10) min-heap.

Run:
    python3 notification_app_be/stage6.py
"""

from __future__ import annotations

import heapq
import json
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_URL = "http://4.224.186.213/evaluation-service/notifications"
TOP_K = 10
TYPE_WEIGHTS = {
    "Placement": 3,
    "Result": 2,
    "Event": 1,
}
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"


class AffordmedLogger:
    """
    Lightweight Affordmed logging adapter.

    The local repository only contains a JS middleware package manifest, not a
    callable Python logging client. This adapter always logs to the console and
    optionally posts logs to AFFORDMED_LOG_URL when configured.
    """

    def __init__(self) -> None:
        logging.basicConfig(
            level=logging.INFO,
            format="[%(levelname)s] %(message)s",
        )
        self._logger = logging.getLogger("stage6")
        self._remote_url = os.getenv("AFFORDMED_LOG_URL")
        self._token = os.getenv("AFFORDMED_LOG_TOKEN")

    def info(self, message: str, **context: Any) -> None:
        self._write("info", message, context)

    def error(self, message: str, **context: Any) -> None:
        self._write("error", message, context)

    def _write(self, level: str, message: str, context: Dict[str, Any]) -> None:
        suffix = f" | {json.dumps(context, default=str)}" if context else ""
        if level == "error":
            self._logger.error("%s%s", message, suffix)
        else:
            self._logger.info("%s%s", message, suffix)

        if not self._remote_url:
            return

        payload = {
            "stack": "backend",
            "level": level,
            "package": "notification_app_be",
            "message": message if not context else f"{message} {context}",
        }
        headers = {"Content-Type": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"

        try:
            request = Request(
                self._remote_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urlopen(request, timeout=3):
                pass
        except Exception as exc:  # Logging failures must not break the program.
            self._logger.debug("Remote Affordmed log failed: %s", exc)


logger = AffordmedLogger()


@dataclass(frozen=True)
class Notification:
    id: str
    type: str
    message: str
    timestamp_text: str
    timestamp: datetime

    @property
    def priority_score(self) -> Tuple[int, float]:
        """
        Heap priority.

        The type weight is first, so every Placement outranks every Result and
        every Result outranks every Event. The Unix timestamp is second, so newer
        notifications outrank older notifications within the same type.
        """
        return (TYPE_WEIGHTS[self.type], self.timestamp.timestamp())

    @property
    def display_score(self) -> str:
        weight, epoch = self.priority_score
        return f"{weight}.{int(epoch)}"


class TopNotificationTracker:
    """Maintains only the best K notifications in a min-heap."""

    def __init__(self, limit: int = TOP_K) -> None:
        self.limit = limit
        self._heap: List[Tuple[Tuple[int, float], int, Notification]] = []
        self._sequence = 0

    def update_top_notifications(self, new_notification: Notification) -> None:
        """
        Update Top K in O(log K).

        The heap root is the weakest current Top K item. New items are pushed
        until the heap reaches K; after that, heapreplace only runs when the new
        notification outranks the weakest current item.
        """
        self._sequence += 1
        entry = (new_notification.priority_score, self._sequence, new_notification)
        logger.info(
            "Priority calculation",
            notification_id=new_notification.id,
            notification_type=new_notification.type,
            priority_score=new_notification.display_score,
        )

        if len(self._heap) < self.limit:
            heapq.heappush(self._heap, entry)
            return

        if entry > self._heap[0]:
            heapq.heapreplace(self._heap, entry)

    def top_notifications(self) -> List[Notification]:
        logger.info("Top 10 generation", heap_size=len(self._heap))
        return [
            entry[2]
            for entry in sorted(
                self._heap,
                key=lambda item: item[0],
                reverse=True,
            )
        ]


tracker = TopNotificationTracker()


def update_top_notifications(new_notification: Dict[str, Any] | Notification) -> None:
    """
    Reusable update function for continuous arrivals.

    Accepts either the raw API-style dictionary or a validated Notification.
    """
    notification = (
        new_notification
        if isinstance(new_notification, Notification)
        else parse_notification(new_notification)
    )
    if notification is not None:
        tracker.update_top_notifications(notification)


def fetch_notifications() -> List[Dict[str, Any]]:
    logger.info("API request start", url=API_URL)

    try:
        request = Request(API_URL, headers={"Accept": "application/json"})
        with urlopen(request, timeout=10) as response:
            status = getattr(response, "status", 200)
            raw_body = response.read().decode("utf-8")
    except HTTPError as exc:
        logger.error("API failure", status=exc.code, reason=exc.reason)
        return []
    except URLError as exc:
        logger.error("API failure", reason=str(exc.reason))
        return []
    except TimeoutError as exc:
        logger.error("API failure", reason=str(exc))
        return []

    logger.info("API request success", status=status)

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        logger.error("Invalid JSON", error=str(exc))
        return []

    notifications = payload.get("notifications") if isinstance(payload, dict) else None
    if notifications is None:
        logger.error("Missing notifications field")
        return []
    if not isinstance(notifications, list):
        logger.error("Invalid notifications field", expected="list")
        return []
    if not notifications:
        logger.error("Empty response", notification_count=0)
        return []

    logger.info("Notification count", count=len(notifications))
    return notifications


def parse_notification(raw: Dict[str, Any]) -> Optional[Notification]:
    required_fields = ("ID", "Type", "Message", "Timestamp")
    if not isinstance(raw, dict):
        logger.error("Invalid notification item", item=raw)
        return None

    missing = [field for field in required_fields if field not in raw]
    if missing:
        logger.error("Missing fields", missing=missing, item=raw)
        return None

    notification_type = str(raw["Type"])
    if notification_type not in TYPE_WEIGHTS:
        logger.error("Invalid notification type", notification_type=notification_type)
        return None

    timestamp_text = str(raw["Timestamp"])
    try:
        timestamp = datetime.strptime(timestamp_text, TIMESTAMP_FORMAT)
    except ValueError:
        logger.error("Invalid timestamp", timestamp=timestamp_text)
        return None

    return Notification(
        id=str(raw["ID"]),
        type=notification_type,
        message=str(raw["Message"]),
        timestamp_text=timestamp_text,
        timestamp=timestamp,
    )


def build_top_notifications(raw_notifications: Iterable[Dict[str, Any]]) -> List[Notification]:
    for raw_notification in raw_notifications:
        update_top_notifications(raw_notification)
    return tracker.top_notifications()


def print_top_notifications(notifications: List[Notification]) -> None:
    if not notifications:
        print("\nNo valid notifications available.")
        return

    print("\nTop 10 Notifications")
    print("-" * 118)
    print(
        f"{'Rank':<6}"
        f"{'ID':<18}"
        f"{'Type':<12}"
        f"{'Timestamp':<22}"
        f"{'Priority Score':<18}"
        "Message"
    )
    print("-" * 118)

    for rank, notification in enumerate(notifications, start=1):
        message = notification.message.replace("\n", " ")
        if len(message) > 42:
            message = f"{message[:39]}..."
        print(
            f"{rank:<6}"
            f"{notification.id:<18.18}"
            f"{notification.type:<12}"
            f"{notification.timestamp_text:<22}"
            f"{notification.display_score:<18}"
            f"{message}"
        )


def main() -> int:
    raw_notifications = fetch_notifications()
    top_notifications = build_top_notifications(raw_notifications)
    print_top_notifications(top_notifications)
    return 0


if __name__ == "__main__":
    sys.exit(main())
