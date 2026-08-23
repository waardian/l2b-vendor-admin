"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { operatorApi, machineryApi, ApiError } from "@/lib/api";
import type { OperatorDetail, MachinerySubcategory } from "@/lib/types";
import { resolveMachinery } from "@/lib/machinery";
import StatusBadge from "@/components/StatusBadge";
import Section from "@/components/Section";
import ApproveRejectRow from "@/components/ApproveRejectRow";
import DocumentImage from "@/components/DocumentImage";
import DigioVerificationPanel from "@/components/DigioVerificationPanel";
import KycDocumentReview from "@/components/KycDocumentReview";

const TERMINAL_OPERATOR_STATUSES = new Set(["approved", "rejected"]);

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

export default function OperatorDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [detail, setDetail] = useState<OperatorDetail | null>(null);
  const [catalog, setCatalog] = useState<MachinerySubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [finalBusy, setFinalBusy] = useState<"approve" | "reject" | null>(null);
  const [actionInFlight, setActionInFlight] = useState(false);

  const currentUserIdRef = useRef(userId);
  useEffect(() => {
    currentUserIdRef.current = userId;
  }, [userId]);

  const load = useCallback(async () => {
    const requestedUserId = userId;
    setLoading(true);
    setError(null);
    try {
      const [operatorDetail, machineryCatalog] = await Promise.all([
        operatorApi.detail(requestedUserId),
        catalog.length > 0 ? Promise.resolve(catalog) : machineryApi.getCatalog(),
      ]);
      if (currentUserIdRef.current !== requestedUserId) return;
      setDetail(operatorDetail);
      setCatalog(machineryCatalog);
    } catch (e) {
      if (currentUserIdRef.current !== requestedUserId) return;
      setError(e instanceof ApiError ? e.message : "Failed to load operator detail");
    } finally {
      if (currentUserIdRef.current === requestedUserId) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setDetail(null);
    load();
  }, [load]);

  const afterReview = async (result: { onboarding_status?: string }) => {
    if (result?.onboarding_status === "approved") {
      setNotice("All items verified — operator auto-approved.");
    }
    await load();
  };

  const handleFinalApprove = async () => {
    setFinalBusy("approve");
    setError(null);
    try {
      await operatorApi.approveFinal(userId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Final approval failed");
    } finally {
      setFinalBusy(null);
    }
  };

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link href="/operators" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">
          ← Back to Operators
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-800">
          {error}
        </div>
      </div>
    );
  }

  if (loading || !detail) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Loading operator verification profile…</span>
        </div>
      </div>
    );
  }

  const { basic_info, profile, skills, kyc, tpi, documents, digio_verifications } = detail;

  const docsFor = (entityType: string, entityId: string) =>
    documents.filter((d) => d.entity_type === entityType && d.entity_id === entityId);

  const isTerminal = TERMINAL_OPERATOR_STATUSES.has((basic_info.onboarding_status ?? "").toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/operators"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {basic_info.name || "(no name)"}
              </h1>
              <StatusBadge status={basic_info.onboarding_status} />
            </div>
            <p className="font-mono text-xs font-medium text-slate-400">Operator User ID: {userId}</p>
          </div>
        </div>

        {!isTerminal && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleFinalApprove}
              disabled={finalBusy !== null || actionInFlight}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              {finalBusy === "approve" ? "Approving…" : "Final Approve Operator"}
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-2xs">
          ✅ {notice}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 shadow-2xs">
          ⚠️ {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {basic_info.profile_photo_url ? (
              <img
                src={basic_info.profile_photo_url}
                alt="Operator Profile"
                className="h-16 w-16 rounded-2xl border-2 border-slate-100 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 font-black text-indigo-600 text-xl border border-indigo-500/20">
                {basic_info.name ? basic_info.name.substring(0, 2).toUpperCase() : "OP"}
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-slate-900">{basic_info.name || "Operator Account"}</h2>
              <p className="font-mono text-xs font-semibold text-slate-500">{basic_info.phone}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
                  {profile?.operator_category ? profile.operator_category.replace(/_/g, " ") : basic_info.role}
                </span>
                <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold uppercase text-indigo-700">
                  {profile?.is_associated_with_company ? "Company Affiliated" : "Independent Operator"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-400">Skills Verified</span>
              <span className="text-sm font-bold text-slate-900">{skills.length} Registered</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-400">Onboarding Step</span>
              <span className="text-sm font-bold text-slate-900">{profile?.onboarding_step || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <Section title="Basic Account Details">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <DetailField label="Phone Number" value={basic_info.phone} />
          <DetailField label="Email Address" value={basic_info.email} />
          <DetailField label="Account Role" value={basic_info.role} />
          <DetailField label="Approved By" value={basic_info.approved_by} />
          <DetailField label="Approved At" value={basic_info.approved_at} />
          <DetailField label="Rejection Reason" value={basic_info.rejection_reason} />
        </dl>
      </Section>

      {(digio_verifications ?? []).length > 0 && (
        <Section title="Automated Digio Verification">
          <DigioVerificationPanel verifications={digio_verifications!} />
        </Section>
      )}

      {kyc && (
        <Section
          title="Operator KYC Verification Review"
          action={
            <div className="flex items-center gap-2">
              <StatusBadge status={kyc.overall_status} />
              {kyc.overall_status !== "verified" && (
                <button
                  onClick={() => operatorApi.approveKyc(userId).then(afterReview)}
                  disabled={actionInFlight}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve KYC Block
                </button>
              )}
            </div>
          }
        >
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
              <DetailField label="Aadhaar Number" value={kyc.aadhaar_number} />
              <DetailField label="PAN Number" value={kyc.pan_number} />
              <DetailField label="DL Number" value={kyc.dl_number} />
              <DetailField label="IFSC Code" value={kyc.ifsc_code} />
              <DetailField label="Bank Name" value={kyc.bank_name} />
              <DetailField label="Bank Branch" value={kyc.bank_branch_name} />
              <DetailField label="Linked Mobile" value={kyc.bank_linked_mobile} />
              <DetailField label="UPI ID" value={kyc.upi_id} />
            </dl>
          </div>
          <KycDocumentReview
            userId={userId}
            documents={docsFor("operator_kyc", kyc.id)}
            disabled={actionInFlight}
            onBusyChange={setActionInFlight}
            afterReview={afterReview}
          />
        </Section>
      )}

      {tpi && (
        <Section title="Operator Third Party Inspection (TPI)">
          <div className="space-y-3">
            <ApproveRejectRow
              label="TPI Inspection Document"
              status={tpi.verification_status}
              rejectionReason={tpi.rejection_reason}
              disabled={actionInFlight}
              onBusyChange={setActionInFlight}
              onApprove={() => operatorApi.approveTpi(userId).then(afterReview)}
              onReject={(reason) => operatorApi.rejectTpi(userId, reason).then(afterReview)}
            />
            {tpi.file_url && (
              <div className="pt-1">
                <DocumentImage doc={tpi} />
              </div>
            )}
          </div>
        </Section>
      )}

      {skills.length > 0 && (
        <Section title={`Machine Skills & Licenses (${skills.length})`}>
          <div className="space-y-4">
            {skills.map((s) => {
              const subcategoryId = s.subcategory_id ?? s.rental_sub_category_id ?? 0;
              const resolved = resolveMachinery(
                catalog,
                subcategoryId,
                s.capacity_id,
                undefined
              );

              const subcategoryName = s.subcategory_name ?? resolved.subcategoryName ?? (subcategoryId ? `Subcategory #${subcategoryId}` : "Skill");
              const categoryName = s.category_name ?? resolved.categoryName;
              const capacityLabel = s.capacity_label ?? resolved.capacityLabel ?? (s.capacity_id ? String(s.capacity_id) : null);

              const skillDocs = docsFor("operator_skill", s.id).concat(docsFor("skill", s.id));

              return (
                <div key={s.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {subcategoryName}
                        {categoryName && (
                          <span className="ml-2 font-semibold text-slate-500">
                            ({categoryName})
                          </span>
                        )}
                      </p>
                      {capacityLabel && (
                        <p className="text-xs font-medium text-slate-500">
                          Capacity: <span className="font-bold text-slate-700">{capacityLabel}</span>
                        </p>
                      )}
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <ApproveRejectRow
                    label="Skill License Document"
                    status={s.status}
                    rejectionReason={s.rejection_reason}
                    disabled={actionInFlight}
                    onBusyChange={setActionInFlight}
                    onApprove={() =>
                      operatorApi.approveSkill(userId, s.id).then(afterReview)
                    }
                    onReject={(reason) =>
                      operatorApi.rejectSkill(userId, s.id, reason).then(afterReview)
                    }
                  />

                  {skillDocs.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {skillDocs.map((doc) => (
                        <DocumentImage key={doc.id} doc={doc} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
