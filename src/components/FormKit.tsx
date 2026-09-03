"use client";

import { useState } from "react";
import { humanise } from "@/lib/labels";

export function FormSection({
  step,
  title,
  blurb,
  children,
}: {
  step: number;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
      <div className="mb-5 flex gap-3.5 items-start">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-extrabold text-amber-400 shadow-sm">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{blurb}</p>
        </div>
      </div>
      <div className="space-y-4 pl-10">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{children}</div>;
}

const CONTROL =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-2xs transition-all " +
  "focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${CONTROL} disabled:bg-slate-100 disabled:text-slate-400`}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${CONTROL} resize-y leading-relaxed`}
    />
  );
}

export function Choice({
  value,
  options,
  onChange,
  placeholder,
  labels,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  labels?: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={CONTROL}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option, index) => (
        <option key={option} value={option}>
          {labels?.[index] ?? humanise(option)}
        </option>
      ))}
    </select>
  );
}

export function ChipGroup({
  label,
  options,
  selected,
  onChange,
  allLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel: string;
}) {
  const none = selected.length === 0;
  return (
    <div>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
            none
              ? "border-slate-900 bg-slate-900 text-white shadow-xs"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {allLabel}
        </button>
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                onChange(on ? selected.filter((v) => v !== option) : [...selected, option])
              }
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                on
                  ? "border-amber-500 bg-amber-500/10 text-amber-800 border-amber-300"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {humanise(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
        checked
          ? "border-amber-300 bg-amber-500/10"
          : "border-slate-300 bg-white hover:bg-slate-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-600 focus:ring-2 focus:ring-amber-500/30"
      />
      <span>
        <span
          className={`block text-xs font-bold ${
            checked ? "text-amber-900" : "text-slate-800"
          }`}
        >
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function Advanced({
  children,
  summary = "Advanced settings",
}: {
  children: React.ReactNode;
  summary?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100/80 transition-colors"
      >
        {summary}
        <span className="text-slate-500 font-medium">{open ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {open && <div className="space-y-4 border-t border-slate-200 bg-white p-4">{children}</div>}
    </div>
  );
}

export function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50/50 p-4 border border-slate-200/60">
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
        In plain English
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{children}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "draft"
        ? "bg-slate-100 text-slate-800 border-slate-200"
        : status === "paused"
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : status === "exhausted"
            ? "bg-rose-50 text-rose-800 border-rose-200"
            : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {humanise(status)}
    </span>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return (
    <div className={`rounded-xl border p-4 text-sm font-semibold shadow-2xs ${styles}`}>
      {children}
    </div>
  );
}
