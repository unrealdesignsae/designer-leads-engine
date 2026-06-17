import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const COOKIE_NAME = "ue_pin_ok";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function redirectBack(req: NextRequest, withError = false) {
  const referer = req.headers.get("referer");
  let target = "/";
  if (referer) {
    try {
      const u = new URL(referer);
      target = u.pathname + (withError ? "?err=1" : "");
    } catch {}
  } else if (withError) {
    target = "/?err=1";
  }
  return NextResponse.redirect(new URL(target, req.url), { status: 303 });
}

export async function GET(req: NextRequest) {
  // GET on this route just bounces back to home
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}

export async function POST(req: NextRequest) {
  const expected = process.env.DASHBOARD_PIN || "2403";

  const ct = req.headers.get("content-type") || "";
  let pin = "";

  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    try {
      const fd = await req.formData();
      pin = String(fd.get("pin") || "").trim();
    } catch {}
  } else if (ct.includes("application/json")) {
    try {
      const j = await req.json();
      pin = String((j && j.pin) || "").trim();
    } catch {}
  }

  // Strict 4-digit numeric
  if (!/^\d{4}$/.test(pin) || pin !== expected) {
    return redirectBack(req, true);
  }

  const res = redirectBack(req, false);
  res.cookies.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
