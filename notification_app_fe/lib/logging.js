export async function logFrontend(level, packageName, message) {
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        level,
        packageName,
        message,
      }),
    });
  } catch {
    // Logging must not interrupt the UI.
  }
}
