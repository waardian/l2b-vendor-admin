"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/http";
import { customerApi, setCustomerToken } from "@/lib/customer-api";

type Mode = "login" | "signup";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep("form");
    setOtp("");
    setDevOtp(null);
    setError(null);
  };

  const submitForm = async () => {
    setBusy(true);
    setError(null);
    try {
      const challenge =
        mode === "signup"
          ? await customerApi.signup({ name, phone, email: email || null })
          : await customerApi.login(phone);
      setDevOtp(challenge.dev_otp);
      setOtp(challenge.dev_otp ?? "");
      setStep("otp");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await customerApi.verify(phone, otp);
      setCustomerToken(session.access_token);
      router.replace("/customer/orders");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not verify the OTP");
    } finally {
      setBusy(false);
    }
  };

  const formReady =
    mode === "signup" ? name.trim().length > 1 && phone.length >= 10 : phone.length >= 10;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <div className="absolute h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 font-black text-slate-950 shadow-lg shadow-amber-500/20">
            L2B
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            Link2Build <span className="text-amber-400">Customer</span>
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Place machinery rental orders & track equipment delivery
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
          {(["signup", "login"] as Mode[]).map((value) => (
            <button
              key={value}
              onClick={() => switchMode(value)}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                mode === value
                  ? "bg-slate-900 text-amber-400 shadow-sm border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {value === "signup" ? "Create Account" : "Sign In"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {step === "form" && mode === "signup" && (
            <>
              <LabelledInput label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
              <LabelledInput
                label="Email Address (optional)"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="john@example.com"
              />
            </>
          )}

          {step === "form" && (
            <LabelledInput
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="10 digit mobile number"
            />
          )}

          {step === "otp" && (
            <>
              <p className="text-xs font-semibold text-slate-300">
                OTP sent to <span className="text-amber-400 font-bold">{phone}</span>
              </p>
              <LabelledInput
                label="OTP Code"
                value={otp}
                onChange={setOtp}
                placeholder="1234"
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              {devOtp && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-400">
                  Local Mode OTP: <span className="text-white font-mono">{devOtp}</span>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}

          {step === "form" ? (
            <button
              onClick={submitForm}
              disabled={busy || !formReady}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
            >
              {busy ? "Sending…" : mode === "signup" ? "Register & Send OTP" : "Send OTP Code"}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={verify}
                disabled={busy || otp.length !== 4}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Verify & Continue"}
              </button>
              <button
                onClick={() => setStep("form")}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-white hover:underline"
              >
                Change Details
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-800 pt-4 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline"
          >
            ← Switch to Admin Console
          </Link>
        </div>
      </div>
    </div>
  );
}

function LabelledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      />
    </label>
  );
}
