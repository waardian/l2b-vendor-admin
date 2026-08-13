"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { vendorApi, machineryApi, ApiError } from "@/lib/api";
import type { VendorDetail, MachinerySubcategory, DocumentSummary } from "@/lib/types";
import { resolveMachinery } from "@/lib/machinery";
import StatusBadge from "@/components/StatusBadge";
import Section from "@/components/Section";
import ApproveRejectRow from "@/components/ApproveRejectRow";
import DocumentImage from "@/components/DocumentImage";
import DigioVerificationPanel from "@/components/DigioVerificationPanel";
import KycDocumentReview from "@/components/KycDocumentReview";

const TERMINAL_VENDOR_STATUSES = new Set(["approved", "rejected"]);

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

export default function VendorDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [detail, setDetail] = useState<VendorDetail | null>(null);
  const [catalog, setCatalog] = useState<MachinerySubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [finalBusy, setFinalBusy] = useState<"approve" | "reject" | null>(null);
  const [finalReason, setFinalReason] = useState("");
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
      const [vendorDetail, machineryCatalog] = await Promise.all([
        vendorApi.detail(requestedUserId),
        catalog.length > 0 ? Promise.resolve(catalog) : machineryApi.getCatalog(),
      ]);
      if (currentUserIdRef.current !== requestedUserId) return;
      setDetail(vendorDetail);
      setCatalog(machineryCatalog);
    } catch (e) {
      if (currentUserIdRef.current !== requestedUserId) return;
      setError(e instanceof ApiError ? e.message : "Failed to load vendor detail");
    } finally {
      if (currentUserIdRef.current === requestedUserId) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    setDetail(null);
    load();
  }, [load]);

  const afterReview = async (result: { onboarding_status?: string }) => {
    if (result?.onboarding_status === "approved") {
      setNotice("All items verified — vendor auto-approved.");
    }
    await load();
  };

  const handleFinalApprove = async () => {
    setFinalBusy("approve");
    setError(null);
    try {
      await vendorApi.approveFinal(userId);
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
        <Link href="/vendors" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">
          ← Back to Vendors
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
          <span className="text-xs font-semibold text-slate-400">Loading vendor verification profile…</span>
        </div>
      </div>
    );
  }

  const {
    basic_info,
    profile,
    company,
    machines,
    skills,
    kyc,
    company_kyc,
    documents,
    digio_verifications,
  } = detail;

  const docsFor = (entityType: string, entityId: string) =>
    documents.filter((d) => d.entity_type === entityType && d.entity_id === entityId);

  const isTerminal = TERMINAL_VENDOR_STATUSES.has((basic_info.onboarding_status ?? "").toLowerCase());

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/vendors"
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
            <p className="font-mono text-xs font-medium text-slate-400">User ID: {userId}</p>
          </div>
        </div>

        {/* Final Decision Bar */}
        {!isTerminal && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleFinalApprove}
              disabled={finalBusy !== null || actionInFlight}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              {finalBusy === "approve" ? "Approving…" : "Final Approve Vendor"}
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

      {/* Main Profile Header Info Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {basic_info.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={basic_info.profile_photo_url}
                alt="Vendor Profile"
                className="h-16 w-16 rounded-2xl border-2 border-slate-100 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 font-black text-amber-600 text-xl border border-amber-500/20">
                {basic_info.name ? basic_info.name.substring(0, 2).toUpperCase() : "VN"}
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-slate-900">{basic_info.name || "Vendor Account"}</h2>
              <p className="font-mono text-xs font-semibold text-slate-500">{basic_info.phone}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
                  {profile?.vendor_category ? profile.vendor_category.replace(/_/g, " ") : basic_info.role}
                </span>
                <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold uppercase text-indigo-700">
                  {profile?.is_company ? (profile.company_type ?? "Company") : "Individual Vendor"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-400">Registered Code</span>
              <span className="font-mono text-sm font-bold text-slate-900">{profile?.vendor_code || "—"}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-400">Total Machines</span>
              <span className="text-sm font-bold text-slate-900">{profile?.machine_count ?? machines.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info Details Section */}
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

      {/* Profile Details Section */}
      {profile && (
        <Section title="Vendor Classification & Onboarding">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
            <DetailField label="Category" value={profile.vendor_category} />
            <DetailField label="Company Format" value={profile.is_company ? "Company" : "Individual"} />
            <DetailField label="Company Structure" value={profile.company_type} />
            <DetailField label="Registered Machines" value={String(profile.machine_count)} />
            <DetailField label="Skills Offered" value={profile.has_skills ? "Yes" : "No"} />
            <DetailField label="Current Step" value={profile.onboarding_step} />
            <DetailField label="Vendor Code" value={profile.vendor_code} />
          </dl>
        </Section>
      )}

      {/* Digio Verification Panel */}
      {(digio_verifications ?? []).length > 0 && (
        <Section title="Automated Digio KYC Verification">
          <DigioVerificationPanel verifications={digio_verifications!} />
        </Section>
      )}

      {/* Vendor KYC Document Review */}
      {kyc && (
        <Section
          title="Vendor KYC Verification Review"
          action={
            <div className="flex items-center gap-2">
              <StatusBadge status={kyc.overall_status} />
              {kyc.overall_status !== "verified" && (
                <button
                  onClick={() => vendorApi.approveKyc(userId).then(afterReview)}
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
              <DetailField label="IFSC Code" value={kyc.ifsc_code} />
              <DetailField label="Bank Name" value={kyc.bank_name} />
              <DetailField label="Bank Branch" value={kyc.bank_branch_name} />
              <DetailField label="Linked Mobile" value={kyc.bank_linked_mobile} />
              <DetailField label="UPI ID" value={kyc.upi_id} />
            </dl>
          </div>
          <KycDocumentReview
            userId={userId}
            documents={docsFor("vendor_kyc", kyc.id)}
            disabled={actionInFlight}
            onBusyChange={setActionInFlight}
            afterReview={afterReview}
          />
        </Section>
      )}

      {/* Company KYC Document Review */}
      {company_kyc && (
        <Section
          title="Company KYC Verification Review"
          action={
            <div className="flex items-center gap-2">
              <StatusBadge status={company_kyc.overall_status} />
              {company_kyc.overall_status !== "verified" && (
                <button
                  onClick={() => vendorApi.approveCompanyKyc(userId).then(afterReview)}
                  disabled={actionInFlight}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve Company KYC Block
                </button>
              )}
            </div>
          }
        >
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
              <DetailField label="Company PAN" value={company_kyc.company_pan_number} />
              <DetailField label="GST Number" value={company_kyc.company_gst_number} />
              <DetailField label="Aadhaar Number" value={company_kyc.aadhaar_number} />
              <DetailField label="IFSC Code" value={company_kyc.ifsc_code} />
              <DetailField label="Bank Name" value={company_kyc.bank_name} />
              <DetailField label="Bank Branch" value={company_kyc.bank_branch_name} />
              <DetailField label="Linked Mobile" value={company_kyc.bank_linked_mobile} />
              <DetailField label="UPI ID" value={company_kyc.upi_id} />
            </dl>
          </div>
          <KycDocumentReview
            userId={userId}
            documents={docsFor("company_kyc", company_kyc.id)}
            disabled={actionInFlight}
            onBusyChange={setActionInFlight}
            afterReview={afterReview}
          />
        </Section>
      )}

      {/* Registered Fleet Machines Section */}
      {machines.length > 0 && (
        <Section title={`Registered Fleet Machines (${machines.length})`}>
          <div className="space-y-6">
            {machines.map((m) => {
              const resolved = resolveMachinery(
                catalog,
                m.subcategory_id,
                m.capacity_id,
                m.variant_id
              );

              // Gather all documents belonging to this machine
              const machineDocs = m.documents && m.documents.length > 0
                ? m.documents
                : docsFor("machine", m.id);

              const rcDocs = machineDocs.filter((d) => d.document_type.includes("rc"));
              const insuranceDocs = machineDocs.filter((d) => d.document_type.includes("insurance"));
              const tpiDocs = machineDocs.filter((d) => d.document_type.includes("tpi"));
              const otherMachineDocs = machineDocs.filter(
                (d) =>
                  !d.document_type.includes("rc") &&
                  !d.document_type.includes("insurance") &&
                  !d.document_type.includes("tpi")
              );

              return (
                <div key={m.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {resolved.subcategoryName ?? `Subcategory #${m.subcategory_id}`}
                        {resolved.categoryName && (
                          <span className="ml-2 font-semibold text-slate-500">
                            ({resolved.categoryName})
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        Capacity: <span className="font-bold text-slate-700">{resolved.capacityLabel ?? m.capacity_id}</span> · Variant: <span className="font-bold text-slate-700">{resolved.variantLabel ?? m.variant_id}</span> · Reg Serial: <span className="font-mono font-bold text-slate-800">{m.registration_serial_no}</span>
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>

                  {/* RC Document Review & Images */}
                  <div className="space-y-2">
                    <ApproveRejectRow
                      label="RC Document"
                      status={m.rc_status}
                      rejectionReason={m.rc_rejection_reason}
                      disabled={actionInFlight}
                      onBusyChange={setActionInFlight}
                      onApprove={() =>
                        vendorApi.approveMachineDoc(userId, m.id, "rc").then(afterReview)
                      }
                      onReject={(reason) =>
                        vendorApi.rejectMachineDoc(userId, m.id, "rc", reason).then(afterReview)
                      }
                    />
                    {rcDocs.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-1">
                        {rcDocs.map((doc) => (
                          <DocumentImage key={doc.id} doc={doc} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Insurance Certificate Review & Images */}
                  <div className="space-y-2">
                    <ApproveRejectRow
                      label="Insurance Certificate"
                      status={m.insurance_status}
                      rejectionReason={m.insurance_rejection_reason}
                      disabled={actionInFlight}
                      onBusyChange={setActionInFlight}
                      onApprove={() =>
                        vendorApi.approveMachineDoc(userId, m.id, "insurance").then(afterReview)
                      }
                      onReject={(reason) =>
                        vendorApi.rejectMachineDoc(userId, m.id, "insurance", reason).then(afterReview)
                      }
                    />
                    {insuranceDocs.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-1">
                        {insuranceDocs.map((doc) => (
                          <DocumentImage key={doc.id} doc={doc} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Third Party Inspection (TPI) Review & Images */}
                  <div className="space-y-2">
                    <ApproveRejectRow
                      label="Third Party Inspection (TPI)"
                      status={m.tpi_status}
                      rejectionReason={m.tpi_rejection_reason}
                      disabled={actionInFlight}
                      onBusyChange={setActionInFlight}
                      onApprove={() =>
                        vendorApi.approveMachineDoc(userId, m.id, "tpi").then(afterReview)
                      }
                      onReject={(reason) =>
                        vendorApi.rejectMachineDoc(userId, m.id, "tpi", reason).then(afterReview)
                      }
                    />
                    {tpiDocs.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-1">
                        {tpiDocs.map((doc) => (
                          <DocumentImage key={doc.id} doc={doc} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Other Uploaded Machine Documents Gallery */}
                  {otherMachineDocs.length > 0 && (
                    <div className="border-t border-slate-200/60 pt-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Additional Machine Document Uploads ({otherMachineDocs.length})
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {otherMachineDocs.map((doc) => (
                          <DocumentImage key={doc.id} doc={doc} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback if machineDocs array is empty but general documents exist for this machine ID */}
                  {machineDocs.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-500">
                      No document image files uploaded for this machine yet.
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
