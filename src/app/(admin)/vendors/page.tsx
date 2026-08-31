"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { vendorApi, ApiError } from "@/lib/api";
import type { VendorListItem } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "rental_vendor", label: "Rental Vendor" },
  { value: "material_vendor", label: "Material Vendor" },
  { value: "logistic_provider", label: "Logistics Provider" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function VendorsListPage() {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vendorApi.list({
        category: category || undefined,
        status: status || undefined,
      });
      setVendors(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [category, status]);

  const filteredVendors = vendors.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.phone?.includes(q) ||
      v.vendor_code?.toLowerCase().includes(q) ||
      v.vendor_category?.toLowerCase().includes(q)
    );
  });

  const totalCount = vendors.length;
  const approvedCount = vendors.filter((v) => v.onboarding_status === "approved").length;
  const pendingCount = vendors.filter((v) => v.onboarding_status === "submitted").length;
  const draftCount = vendors.filter((v) => v.onboarding_status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Vendors Directory</h1>
          <p className="text-xs font-medium text-slate-500">
            View, filter, and inspect onboarding verification for rental & material vendors.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] font-semibold text-amber-400 border border-slate-800 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          GET /rentals/admin/vendors
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Total Vendors</span>
            <span className="rounded-full bg-slate-100 p-2 text-slate-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Approved Vendors</span>
            <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-600">{approvedCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Pending Review</span>
            <span className="rounded-full bg-amber-50 p-2 text-amber-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-amber-600">{pendingCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Draft Applications</span>
            <span className="rounded-full bg-slate-100 p-2 text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-600">{draftCount}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search vendor name, phone, or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={load}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
        >
          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 shadow-2xs">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="text-left">Vendor Name</th>
              <th className="text-left">Phone Number</th>
              <th className="text-left">Category</th>
              <th className="text-left">Company Type</th>
              <th className="text-center">Machines</th>
              <th className="text-center">Skills</th>
              <th className="text-center">Onboarding Status</th>
              <th className="text-right">Vendor Code</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    <span className="text-xs font-semibold text-slate-400">Loading vendor records…</span>
                  </div>
                </td>
              </tr>
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-600">No vendor records found</span>
                    <span className="text-xs text-slate-400">Try adjusting your filters or search terms</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVendors.map((v) => (
                <tr key={v.user_id} className="transition-colors hover:bg-slate-50/80">
                  <td className="font-semibold text-slate-900">
                    <Link
                      href={`/vendors/${v.user_id}`}
                      className="group inline-flex items-center gap-1.5 font-bold text-slate-900 hover:text-amber-600"
                    >
                      <span>{v.name || "(no name)"}</span>
                      <svg className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                  <td className="font-mono text-xs font-semibold text-slate-600">{v.phone}</td>
                  <td className="text-slate-700">
                    <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                      {v.vendor_category ? v.vendor_category.replace(/_/g, " ") : "vendor"}
                    </span>
                  </td>
                  <td className="text-slate-600">
                    <span className="text-xs font-medium text-slate-600">
                      {v.is_company ? (v.company_type ?? "Company") : "Individual"}
                    </span>
                  </td>
                  <td className="text-center font-semibold text-slate-900">{v.machine_count}</td>
                  <td className="text-center">
                    {v.has_skills ? (
                      <span className="inline-flex rounded-md bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-xs font-bold text-amber-700">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">No</span>
                    )}
                  </td>
                  <td className="text-center">
                    <StatusBadge status={v.onboarding_status} />
                  </td>
                  <td className="text-right font-mono text-xs font-bold text-slate-500">
                    {v.vendor_code || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
