"use client";

import type { DocumentSummary } from "@/lib/types";
import { kycDocumentApi } from "@/lib/api";
import ApproveRejectRow from "./ApproveRejectRow";
import DocumentImage from "./DocumentImage";

/** Plain-English names for the document types a KYC block can hold. Anything not listed
 * falls back to a title-cased version of the raw type, so a new document type added on
 * the backend still reads sensibly without a web release. */
const DOCUMENT_LABELS: Record<string, string> = {
  aadhaar_front: "Aadhaar — front",
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

/** Per-document approve/reject for one KYC block.
 *
 * Reviewing at this level rather than on the block as a whole is what lets the partner
 * app put a red border and a reason on the exact field that failed, and require only
 * that document to be re-uploaded. Everything else in the block keeps its own status —
 * verified stays verified — so nothing already accepted is re-checked or re-charged to
 * Digio. The block itself is pulled back to Rejected automatically while any document
 * here is rejected. */
export default function KycDocumentReview({
  userId,
  documents,
  disabled,
  onBusyChange,
  afterReview,
}: Props) {
  if (documents.length === 0) {
    return <p className="text-sm text-gray-400">No documents uploaded for this block.</p>;
  }

  return (
    <div className="mb-3 rounded-md border border-gray-100 p-3">
      <p className="mb-2 text-xs text-gray-500">
        Review each document on its own. The partner is shown your reason against that
        exact field and only has to re-upload the one you reject.
      </p>
      {documents.map((doc) => (
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
