import { createRequire } from "module";
import { NextResponse } from "next/server";

const require = createRequire(import.meta.url);
const { Log } = require("../../../node_modules/logging_middleware/index.js");

const NOTIFICATION_API_URL =
  process.env.NOTIFICATION_API_URL ||
  "http://4.224.186.213/evaluation-service/notifications";

async function safeLog(level, packageName, message) {
  try {
    await Log("backend", level, packageName, message);
  } catch {
    // Keep the API route available even when remote logging is unavailable.
  }
}

export async function GET(request) {
  await safeLog("info", "route", "frontend notification proxy request start");

  const { searchParams } = new URL(request.url);
  const upstreamUrl = new URL(NOTIFICATION_API_URL);

  for (const key of ["limit", "page", "notification_type"]) {
    const value = searchParams.get(key);
    if (value) {
      upstreamUrl.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(upstreamUrl.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.ACCESS_TOKEN || ""}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      await safeLog(
        "error",
        "route",
        `notification proxy upstream failed with status ${response.status}`
      );
      return NextResponse.json(
        { notifications: [], error: "Unable to fetch notifications" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const notifications = Array.isArray(data.notifications)
      ? data.notifications
      : [];

    await safeLog(
      "info",
      "route",
      `notification proxy returned ${notifications.length} notifications`
    );

    return NextResponse.json({ notifications });
  } catch (error) {
    await safeLog(
      "error",
      "route",
      `notification proxy failed: ${error.message}`
    );

    return NextResponse.json(
      { notifications: [], error: "Notification service unavailable" },
      { status: 503 }
    );
  }
}
