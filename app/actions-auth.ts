"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { generateCode, storeOtp, checkOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/auth/email";
import { createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface OtpRequestResult {
  ok: boolean;
  error?: string;
  delivered?: boolean;
  devCode?: string;
}

export async function requestOtp(email: string): Promise<OtpRequestResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return { ok: false, error: "Enter a valid email address." };
  try {
    const code = generateCode();
    await storeOtp(clean, code);
    const res = await sendOtpEmail(clean, code);
    return { ok: true, delivered: res.delivered, devCode: res.devCode };
  } catch (err) {
    console.error("[MeterMatch] requestOtp failed:", err);
    return { ok: false, error: "Couldn't send a code. Try again." };
  }
}

export async function verifyOtp(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Enter the 6-digit code." };
  const valid = await checkOtp(clean, code.trim());
  if (!valid) return { ok: false, error: "Invalid or expired code." };

  const token = await createSessionToken(clean);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}

export async function currentUser(): Promise<{ email: string } | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}
