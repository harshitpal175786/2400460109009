export const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

export function getPriorityScore(notification) {
  const typeWeight = TYPE_WEIGHTS[notification.Type] || 0;
  const timestampMs = new Date(notification.Timestamp.replace(" ", "T")).getTime();

  return {
    typeWeight,
    timestampMs: Number.isNaN(timestampMs) ? 0 : timestampMs,
    display: `${typeWeight}.${Number.isNaN(timestampMs) ? 0 : timestampMs}`,
  };
}

function comparePriority(a, b) {
  const scoreA = getPriorityScore(a);
  const scoreB = getPriorityScore(b);

  if (scoreA.typeWeight !== scoreB.typeWeight) {
    return scoreA.typeWeight - scoreB.typeWeight;
  }

  return scoreA.timestampMs - scoreB.timestampMs;
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

export function getTopPriorityNotifications(notifications, limit) {
  const heap = new MinHeap(comparePriority);

  for (const notification of notifications) {
    if (!notification || !notification.Type || !notification.Timestamp) {
      continue;
    }

    if (heap.size() < limit) {
      heap.push(notification);
      continue;
    }

    if (comparePriority(notification, heap.peek()) > 0) {
      heap.replaceRoot(notification);
    }
  }

  return heap.items.sort((a, b) => comparePriority(b, a));
}
