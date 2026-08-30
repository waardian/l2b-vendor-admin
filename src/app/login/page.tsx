"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, setToken, ApiError } from "@/lib/api";

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("9999999999");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPhoneValid = MOBILE_PATTERN.test(phone.trim());

  const sendOtp = async () => {
    if (!isPhoneValid) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.sendOtp(phone);
      setStep("otp");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.verifyOtp(phone, otp);
      if (!res.success || !res.access_token) {
        setError(res.message ?? "Invalid OTP");
        return;
      }
      setToken(res.access_token);
      router.replace("/vendors");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to verify OTP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <div className="absolute h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 font-black text-slate-950 shadow-lg shadow-amber-500/20">
            L2B
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            Link2Build <span className="text-amber-400">Admin</span>
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Operations Console & Verification Portal
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={step === "otp"}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-900 disabled:text-slate-500"
              />
            </div>
          </div>

          {step === "otp" && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 4-digit code (e.g. 1234)"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}

          {step === "phone" ? (
            <button
              onClick={sendOtp}
              disabled={busy || !isPhoneValid}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
            >
              {busy ? "Sending OTP…" : "Send OTP"}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={verifyOtp}
                disabled={busy || !otp}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Verify & Sign In"}
              </button>
              <button
                onClick={() => setStep("phone")}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-white hover:underline"
              >
                Change Phone Number
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-800 pt-5 text-center">
          <p className="text-xs font-mono text-slate-400">
            Default Test Credentials: <span className="text-amber-400 font-bold">9999999999</span> / OTP <span className="text-amber-400 font-bold">1234</span>
          </p>
          <Link
            href="/customer/login"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline"
          >
            <span>Customer Portal App</span>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
