import { createRequire } from "module";
import { NextResponse } from "next/server";

const require = createRequire(import.meta.url);
const { Log } = require("../../../node_modules/logging_middleware");

export async function POST(request) {
  try {
    const body = await request.json();
    const level = body.level || "info";
    const packageName = body.packageName || "component";
    const message = body.message || "frontend event";

    await Log("frontend", level, packageName, message);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
