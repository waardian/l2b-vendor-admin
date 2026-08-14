"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { getToken } from "@/lib/api";
import apiDataRaw from "@/lib/apiDocsData.json";

interface ParamItem {
  name: string;
  in: string;
  type: string;
  required: boolean;
  description: string;
}

interface RequestBodyItem {
  contentType: string;
  example: unknown;
}

interface ResponseItem {
  statusCode: string;
  description: string;
  contentType: string;
  example: unknown;
}

interface EndpointItem {
  id: string;
  method: string;
  path: string;
  summary: string;
  purpose: string;
  useCase: string;
  flow: string;
  authRequired: boolean;
  parameters: ParamItem[];
  requestBody: RequestBodyItem | null;
  responses: ResponseItem[];
}

interface GroupItem {
  groupName: string;
  endpoints: EndpointItem[];
}

const apiGroups: GroupItem[] = apiDataRaw as GroupItem[];

export default function ApiDocsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoggedIn(Boolean(getToken()));
  }, []);

  // Total endpoint count
  const totalCount = useMemo(() => {
    return apiGroups.reduce((acc, g) => acc + g.endpoints.length, 0);
  }, []);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return apiGroups
      .map((group) => {
        const matchingEndpoints = group.endpoints.filter((ep) => {
          const matchesMethod = methodFilter === "ALL" || ep.method === methodFilter;
          const matchesQuery =
            !query ||
            ep.path.toLowerCase().includes(query) ||
            ep.summary.toLowerCase().includes(query) ||
            ep.purpose.toLowerCase().includes(query) ||
            ep.useCase.toLowerCase().includes(query) ||
            ep.flow.toLowerCase().includes(query);
          return matchesMethod && matchesQuery;
        });
        return {
          ...group,
          endpoints: matchingEndpoints,
        };
      })
      .filter((group) => group.endpoints.length > 0);
  }, [searchQuery, methodFilter]);

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAll = () => {
    const allAreOpen = Object.values(expandedCards).some(Boolean);
    if (allAreOpen) {
      setExpandedCards({});
    } else {
      const allOpen: Record<string, boolean> = {};
      filteredGroups.forEach((g) => {
        g.endpoints.forEach((ep) => {
          allOpen[ep.id] = true;
        });
      });
      setExpandedCards(allOpen);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "POST":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PUT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PATCH":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getMethodLeftBorder = (method: string) => {
    switch (method) {
      case "GET":
        return "border-l-[3.5px] border-l-sky-500";
      case "POST":
        return "border-l-[3.5px] border-l-emerald-500";
      case "PUT":
        return "border-l-[3.5px] border-l-amber-500";
      case "PATCH":
        return "border-l-[3.5px] border-l-purple-500";
      case "DELETE":
        return "border-l-[3.5px] border-l-rose-500";
      default:
        return "border-l-[3.5px] border-l-slate-400";
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar only rendered when logged in */}
      {isLoggedIn && <Sidebar />}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-8 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {!isLoggedIn && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 font-extrabold text-slate-950 text-xs shadow-xs">
                L2B
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                Link2Build API Reference
              </h1>
              {!isLoggedIn && (
                <span className="text-[11px] font-medium text-slate-500">Interactive API Catalogue</span>
              )}
            </div>
            <span className="h-4 w-px bg-slate-200" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {totalCount} APIs Available
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Method Filter Pills */}
            <div className="flex gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 text-xs font-semibold">
              {["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    methodFilter === m
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search path, keywords, flow…"
                className="w-64 rounded-xl border border-slate-200/80 bg-slate-50/80 pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Expand / Collapse All */}
            <button
              onClick={toggleAll}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              {Object.values(expandedCards).some(Boolean) ? "Collapse All" : "Expand All"}
            </button>

            {/* Admin Login link if not logged in */}
            {!isLoggedIn && (
              <Link
                href="/login"
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs transition"
              >
                Admin Login
              </Link>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className={isLoggedIn ? "space-y-9" : "max-w-7xl mx-auto space-y-9"}>
            {filteredGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-sm font-semibold text-slate-700">No matching endpoints found</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing your search query or switching method filter to ALL.</p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <section key={group.groupName} className="space-y-3">
                  {/* Feature Module Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">{group.groupName}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                        {group.endpoints.length} APIs
                      </span>
                    </div>
                  </div>

                  {/* Endpoints List */}
                  <div className="space-y-2.5">
                    {group.endpoints.map((ep) => {
                      const isOpen = Boolean(expandedCards[ep.id]);
                      return (
                        <div
                          key={ep.id}
                          className={`rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all duration-150 overflow-hidden ${getMethodLeftBorder(
                            ep.method
                          )}`}
                        >
                          {/* Endpoint Header Row (Click to toggle) */}
                          <div
                            onClick={() => toggleCard(ep.id)}
                            className="flex items-center justify-between gap-4 p-3 cursor-pointer select-none hover:bg-slate-50/80 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                className={`rounded-md px-2.5 py-1 text-[11px] font-mono font-bold border ${getMethodBadgeClass(
                                  ep.method
                                )}`}
                              >
                                {ep.method}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
                                {ep.path}
                              </span>
                              <span className="text-xs text-slate-500 truncate hidden md:inline">
                                {ep.summary}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {ep.authRequired ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60">
                                  Bearer Token
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                                  Public
                                </span>
                              )}
                              <svg
                                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Collapsible Details Body */}
                          {isOpen && (
                            <div className="border-t border-slate-100 bg-slate-50/40 p-4 space-y-4">
                              {/* Simple & Clean 3-Box Information */}
                              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-2.5 text-xs">
                                <div>
                                  <span className="font-bold text-blue-950 block mb-0.5">
                                    Purpose:
                                  </span>
                                  <p className="text-slate-800 leading-relaxed font-medium">{ep.purpose}</p>
                                </div>
                                
                                <div className="pt-2 border-t border-blue-100/70">
                                  <span className="font-bold text-slate-800 block mb-0.5">
                                    Use Case:
                                  </span>
                                  <p className="text-slate-700 leading-relaxed">{ep.useCase}</p>
                                </div>

                                <div className="pt-2 border-t border-blue-100/70">
                                  <span className="font-bold text-slate-800 block mb-0.5">
                                    Flow:
                                  </span>
                                  <p className="text-slate-700 leading-relaxed font-mono text-[11.5px] bg-white/70 p-2 rounded border border-blue-100/60">
                                    {ep.flow}
                                  </p>
                                </div>
                              </div>

                              {/* Parameters Table */}
                              {ep.parameters.length > 0 && (
                                <div className="space-y-1.5">
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Parameters
                                  </h4>
                                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                                        <tr>
                                          <th className="px-3 py-2">Parameter</th>
                                          <th className="px-3 py-2">In</th>
                                          <th className="px-3 py-2">Type</th>
                                          <th className="px-3 py-2">Requirement</th>
                                          <th className="px-3 py-2">Description</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {ep.parameters.map((param, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-3 py-2 font-mono font-semibold text-blue-600">
                                              {param.name}
                                            </td>
                                            <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                                              {param.in}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-slate-600 text-[11px]">
                                              <span className="rounded bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                                                {param.type}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              {param.required ? (
                                                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200/60">
                                                  Required
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 text-[11px]">Optional</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">{param.description}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Request Body with Copy Button */}
                              {ep.requestBody && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                      Request Payload ({ep.requestBody.contentType})
                                    </h4>
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          JSON.stringify(ep.requestBody?.example, null, 2),
                                          `${ep.id}-req`
                                        )
                                      }
                                      className="rounded bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition"
                                    >
                                      {copiedId === `${ep.id}-req` ? "Copied" : "Copy Payload"}
                                    </button>
                                  </div>
                                  <div className="rounded-lg bg-slate-900 p-3.5 font-mono text-[11.5px] text-emerald-400 overflow-x-auto shadow-inner border border-slate-800">
                                    <pre>
                                      <code>{JSON.stringify(ep.requestBody.example, null, 2)}</code>
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Responses */}
                              {ep.responses.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    Response Status & Body
                                  </h4>
                                  <div className="space-y-2">
                                    {ep.responses.map((resp, rIdx) => {
                                      const isError = resp.statusCode.startsWith("4") || resp.statusCode.startsWith("5");
                                      return (
                                        <div
                                          key={rIdx}
                                          className="rounded-lg border border-slate-200/80 bg-white p-3 space-y-2 shadow-xs"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`rounded px-2 py-0.5 font-mono text-xs font-bold border ${
                                                  isError
                                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                }`}
                                              >
                                                {resp.statusCode}
                                              </span>
                                              <span className="text-xs font-semibold text-slate-700">
                                                {resp.description || (isError ? "Error Response" : "Success")}
                                              </span>
                                            </div>
                                            {Boolean(resp.example) && (
                                              <button
                                                onClick={() =>
                                                  copyToClipboard(
                                                    JSON.stringify(resp.example, null, 2),
                                                    `${ep.id}-resp-${resp.statusCode}`
                                                  )
                                                }
                                                className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                                              >
                                                {copiedId === `${ep.id}-resp-${resp.statusCode}` ? "Copied" : "Copy Response"}
                                              </button>
                                            )}
                                          </div>

                                          {Boolean(resp.example) && (
                                            <div className="rounded bg-slate-900 p-2.5 font-mono text-[11px] text-slate-100 overflow-x-auto border border-slate-800">
                                              <pre>
                                                <code>{JSON.stringify(resp.example, null, 2)}</code>
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
