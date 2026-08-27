import { NextRequest, NextResponse } from "next/server";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const globalForContact = globalThis as typeof globalThis & {
  contactRateLimit?: Map<string, RateLimitEntry>;
};

const contactRateLimit =
  globalForContact.contactRateLimit ?? new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForContact.contactRateLimit = contactRateLimit;
}

function cleanSingleLine(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength)
    : "";
}

function cleanMessage(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRateLimited(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientId = forwardedFor?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = contactRateLimit.get(clientId);

  if (!current || current.expiresAt <= now) {
    contactRateLimit.set(clientId, {
      count: 1,
      expiresAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Bots commonly fill hidden fields. Return success without sending an email.
  if (cleanSingleLine(payload.website, 200)) {
    return NextResponse.json({ success: true });
  }

  const name = cleanSingleLine(payload.name, 100);
  const email = cleanSingleLine(payload.email, 254).toLowerCase();
  const age = cleanSingleLine(payload.age, 30);
  const interest = cleanSingleLine(payload.interest, 100);
  const message = cleanMessage(payload.message, 3000);

  if (!name || !isValidEmail(email) || !age || !interest || !message) {
    return NextResponse.json(
      { error: "Please complete every required field with valid information." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? "annadanceacademy@gmail.com";
  const from =
    process.env.RESEND_FROM_EMAIL ??
    "Anna Dance Academy <onboarding@resend.dev>";

  if (!apiKey) {
    console.error("Contact form is missing RESEND_API_KEY.");
    return NextResponse.json(
      { error: "The contact form is temporarily unavailable." },
      { status: 503 },
    );
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `New ${interest} inquiry from ${name}`,
      text: [
        "New website inquiry",
        "",
        `Parent or guardian: ${name}`,
        `Email: ${email}`,
        `Dancer's age: ${age}`,
        `Class interest: ${interest}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend contact email failed:", response.status, errorText);
    return NextResponse.json(
      { error: "We couldn't send your message. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
