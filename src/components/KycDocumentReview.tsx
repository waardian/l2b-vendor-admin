"use client";

import type { DocumentSummary } from "@/lib/types";
import { kycDocumentApi } from "@/lib/api";
import ApproveRejectRow from "./ApproveRejectRow";
import DocumentImage from "./DocumentImage";

const DOCUMENT_LABELS: Record<string, string> = {
  aadhaar_front: "Aadhaar Card",
  pan_card: "PAN card",
  company_pan: "Company PAN",
  cancelled_cheque: "Cancelled cheque",
  gst_certificate: "GST certificate",
  trade_license: "Trade licence",
  dl_front: "Driving licence — front",
  dl_back: "Driving licence — back",
  tpi_cert: "TPI certificate",
};

function documentLabel(documentType: string): string {
  return (
    DOCUMENT_LABELS[documentType] ??
    documentType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

interface Props {
  userId: string;
  documents: DocumentSummary[];
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  afterReview: (result: { onboarding_status?: string }) => Promise<void>;
}

export default function KycDocumentReview({
  userId,
  documents,
  disabled,
  onBusyChange,
  afterReview,
}: Props) {
  const visibleDocs = documents.filter((doc) => doc.document_type !== "aadhaar_back");

  if (visibleDocs.length === 0) {
    return <p className="text-sm text-gray-400">No documents uploaded for this block.</p>;
  }

  return (
    <div className="mb-3 rounded-md border border-gray-100 p-3">
      <p className="mb-2 text-xs text-gray-500">
        Review each document on its own. The partner is shown your reason against that
        exact field and only has to re-upload the one you reject.
      </p>
      {visibleDocs.map((doc) => (
        <div key={doc.id}>
          <ApproveRejectRow
            label={documentLabel(doc.document_type)}
            status={doc.verification_status}
            rejectionReason={doc.rejection_reason}
            disabled={disabled}
            onBusyChange={onBusyChange}
            onApprove={() => kycDocumentApi.approve(userId, doc.id).then(afterReview)}
            onReject={(reason) => kycDocumentApi.reject(userId, doc.id, reason).then(afterReview)}
          />
          <div className="mb-2 mt-1">
            <DocumentImage doc={doc} />
          </div>
        </div>
      ))}
    </div>
  );
}
