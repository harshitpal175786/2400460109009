"use strict";

const { Log } = require("../logging_middleware");

const API_URL =
  process.env.NOTIFICATION_API_URL ||
  "http://4.224.186.213/evaluation-service/notifications";

const TOP_K = Number(process.env.TOP_K || 10);
const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

async function safeLog(stack, level, packageName, message) {
  try {
    await Log(stack, level, packageName, message);
  } catch {
    // The assessment disallows console/inbuilt logger for app logs. Logging
    // failures are intentionally swallowed so the main program still runs.
  }
}

class MinHeap {
  constructor(compare) {
    this.items = [];
    this.compare = compare;
  }

  size() {
    return this.items.length;
  }

  peek() {
    return this.items[0];
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  replaceRoot(item) {
    this.items[0] = item;
    this.bubbleDown(0);
  }

  toArray() {
    return [...this.items];
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.items[index], this.items[parent]) >= 0) {
        break;
      }
      [this.items[index], this.items[parent]] = [
        this.items[parent],
        this.items[index],
      ];
      index = parent;
    }
  }

  bubbleDown(index) {
    const length = this.items.length;

    while (true) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;

      if (
        left < length &&
        this.compare(this.items[left], this.items[smallest]) < 0
      ) {
        smallest = left;
      }

      if (
        right < length &&
        this.compare(this.items[right], this.items[smallest]) < 0
      ) {
        smallest = right;
      }

      if (smallest === index) {
        break;
      }

      [this.items[index], this.items[smallest]] = [
        this.items[smallest],
        this.items[index],
      ];
      index = smallest;
    }
  }
}

function parseTimestamp(timestamp) {
  if (typeof timestamp !== "string") {
    return null;
  }

  const parsed = new Date(timestamp.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function comparePriority(a, b) {
  if (a.typeWeight !== b.typeWeight) {
    return a.typeWeight - b.typeWeight;
  }

  if (a.timestampMs !== b.timestampMs) {
    return a.timestampMs - b.timestampMs;
  }

  return a.sequence - b.sequence;
}

function validateNotification(raw, sequence) {
  if (!raw || typeof raw !== "object") {
    return { error: "notification item is not an object" };
  }

  for (const field of ["ID", "Type", "Message", "Timestamp"]) {
    if (!(field in raw)) {
      return { error: `missing field ${field}` };
    }
  }

  if (!(raw.Type in TYPE_WEIGHTS)) {
    return { error: `invalid notification type ${raw.Type}` };
  }

  const timestamp = parseTimestamp(raw.Timestamp);
  if (!timestamp) {
    return { error: `invalid timestamp ${raw.Timestamp}` };
  }

  return {
    notification: {
      id: String(raw.ID),
      type: raw.Type,
      message: String(raw.Message),
      timestampText: String(raw.Timestamp),
      timestampMs: timestamp.getTime(),
      typeWeight: TYPE_WEIGHTS[raw.Type],
      sequence,
    },
  };
}

class TopNotificationTracker {
  constructor(limit = TOP_K) {
    this.limit = limit;
    this.sequence = 0;
    this.heap = new MinHeap(comparePriority);
  }

  async updateTopNotifications(rawNotification) {
    this.sequence += 1;
    const { notification, error } = validateNotification(
      rawNotification,
      this.sequence
    );

    if (error) {
      await safeLog("backend", "error", "service", error);
      return;
    }

    await safeLog(
      "backend",
      "debug",
      "service",
      `priority calculated for ${notification.id}: ${notification.typeWeight}.${notification.timestampMs}`
    );

    if (this.heap.size() < this.limit) {
      this.heap.push(notification);
      return;
    }

    if (comparePriority(notification, this.heap.peek()) > 0) {
      this.heap.replaceRoot(notification);
    }
  }

  topNotifications() {
    return this.heap.toArray().sort((a, b) => comparePriority(b, a));
  }
}

const tracker = new TopNotificationTracker();

async function update_top_notifications(newNotification) {
  await tracker.updateTopNotifications(newNotification);
}

async function fetchNotifications() {
  await safeLog("backend", "info", "service", "notification API request start");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.NOTIFICATION_TIMEOUT_MS || 10000)
    );

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.ACCESS_TOKEN || ""}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    await safeLog(
      "backend",
      "info",
      "service",
      `notification API request success with status ${response.status}`
    );

    if (!response.ok) {
      await safeLog(
        "backend",
        "error",
        "service",
        `notification API failure: status ${response.status}`
      );
      return [];
    }

    let data;
    try {
      data = await response.json();
    } catch {
      await safeLog("backend", "error", "service", "invalid JSON from API");
      return [];
    }

    if (!data || !Array.isArray(data.notifications)) {
      await safeLog("backend", "error", "service", "invalid notifications JSON");
      return [];
    }

    if (data.notifications.length === 0) {
      await safeLog("backend", "warn", "service", "empty notification response");
      return [];
    }

    await safeLog(
      "backend",
      "info",
      "service",
      `notification count ${data.notifications.length}`
    );

    return data.notifications;
  } catch (error) {
    await safeLog(
      "backend",
      "error",
      "service",
      `notification API failure: ${error.name || error.code || error.message}`
    );
    return [];
  }
}

function priorityScore(notification) {
  return `${notification.typeWeight}.${notification.timestampMs}`;
}

function printTopNotifications(notifications) {
  if (notifications.length === 0) {
    process.stdout.write("\nNo valid notifications available.\n");
    return;
  }

  process.stdout.write("\nTop 10 Priority Notifications\n");
  process.stdout.write("Priority rule: Placement > Result > Event, then newer first\n\n");
  process.stdout.write(
    `${"Rank".padEnd(6)}${"ID".padEnd(38)}${"Type".padEnd(12)}${"Timestamp".padEnd(22)}${"Priority Score".padEnd(22)}Message\n`
  );
  process.stdout.write("-".repeat(122) + "\n");

  notifications.forEach((notification, index) => {
    const message =
      notification.message.length > 42
        ? `${notification.message.slice(0, 39)}...`
        : notification.message;

    process.stdout.write(
      `${String(index + 1).padEnd(6)}` +
        `${notification.id.padEnd(38)}` +
        `${notification.type.padEnd(12)}` +
        `${notification.timestampText.padEnd(22)}` +
        `${priorityScore(notification).padEnd(22)}` +
        `${message}\n`
    );
  });
}

async function main() {
  const notifications = await fetchNotifications();

  for (const notification of notifications) {
    await update_top_notifications(notification);
  }

  const topNotifications = tracker.topNotifications();
  await safeLog(
    "backend",
    "info",
    "service",
    `top 10 generated with ${topNotifications.length} notifications`
  );
  printTopNotifications(topNotifications);
}

if (require.main === module) {
  main().catch(async (error) => {
    await safeLog("backend", "fatal", "service", `stage6 crashed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  TopNotificationTracker,
  update_top_notifications,
  validateNotification,
};
