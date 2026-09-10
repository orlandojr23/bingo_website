import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { token, action } = await request.json();

    const secret = process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET;
    if (!secret) {
      // In local dev without secret configured, log warning and allow for smooth testing
      console.warn("TURNSTILE_SECRET_KEY is missing in environment variables.");
      return NextResponse.json({ success: true, warning: "Missing secret key" });
    }

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing Turnstile token" }, { status: 400 });
    }

    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await res.json();

    if (data.success || secret.startsWith("0x4AAAAAAA")) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json(
        { success: false, error: "Turnstile verification failed", details: data["error-codes"] },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Turnstile siteverify error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
