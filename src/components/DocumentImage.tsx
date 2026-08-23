"use client";

import { useState } from "react";
import { formatDocumentType } from "@/lib/machinery";
import StatusBadge from "./StatusBadge";
import type { DocumentSummary } from "@/lib/types";

export default function DocumentImage({ doc }: { doc: DocumentSummary }) {
  const [failed, setFailed] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <div className="group relative inline-block w-44 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xs transition-all hover:border-amber-400 hover:shadow-md">
        <div
          onClick={() => (!failed ? setOpenModal(true) : window.open(doc.file_url, "_blank"))}
          className="relative h-28 w-full cursor-pointer overflow-hidden bg-slate-200/80"
        >
          {failed ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-xs font-semibold text-slate-500">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>View Document File</span>
            </div>
          ) : (
            <>
              <img
                src={doc.file_url}
                alt={doc.document_type}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setFailed(true)}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-900 shadow-sm">
                  🔍 Preview Image
                </span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-1 p-2.5 bg-white">
          <p className="truncate text-xs font-bold text-slate-800" title={formatDocumentType(doc.document_type)}>
            {formatDocumentType(doc.document_type)}
          </p>
          <div className="flex items-center justify-between">
            <StatusBadge status={doc.verification_status} />
            <a
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              title="Open full file in new tab"
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
            >
              ↗ Open
            </a>
          </div>
          {doc.rejection_reason && (
            <p className="text-[10px] font-semibold text-rose-600 truncate" title={doc.rejection_reason}>
              Reason: {doc.rejection_reason}
            </p>
          )}
        </div>
      </div>

      {openModal && (
        <div
          onClick={() => setOpenModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3 text-white">
              <div>
                <h3 className="text-sm font-bold">{formatDocumentType(doc.document_type)}</h3>
                <p className="text-xs text-slate-400">Document URL Preview</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  Open Original ↗
                </a>
                <button
                  onClick={() => setOpenModal(false)}
                  className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-2xl bg-slate-950 p-2">
              <img
                src={doc.file_url}
                alt={doc.document_type}
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
