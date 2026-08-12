"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent"></div>
          <span className="text-xs font-semibold text-slate-400">Authenticating operations session…</span>
        </div>
      </div>
    );
  }

  // Derive route title
  const getPageTitle = () => {
    if (pathname?.startsWith("/vendors")) return "Vendor Management";
    if (pathname?.startsWith("/operators")) return "Operator Management";
    if (pathname?.startsWith("/fee-rules")) return "Deduction Rules Engine";
    if (pathname?.startsWith("/campaigns")) return "Incentive Campaigns";
    if (pathname?.startsWith("/legacy")) return "Legacy Endpoint Console";
    return "Operations Dashboard";
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">{getPageTitle()}</h2>
            <span className="h-4 w-px bg-slate-200" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API Connected
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs text-slate-600 border border-slate-200/60">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Quick filter by ID, phone or code</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
