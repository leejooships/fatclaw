import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleToken } from "@/lib/googleAuth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { googleIdToken } = body;

  if (!googleIdToken) {
    return NextResponse.json(
      { error: "Google token required" },
      { status: 400 },
    );
  }

  const payload = await verifyGoogleToken(googleIdToken);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid Google token" },
      { status: 401 },
    );
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  const isAdmin = adminEmails.includes(payload.email.toLowerCase());
  return NextResponse.json({ firstName: payload.firstName.slice(0, 16), isAdmin });
}
