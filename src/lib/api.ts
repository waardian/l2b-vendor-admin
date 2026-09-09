import type {
  LoginResponse,
  VendorListItem,
  VendorDetail,
  OperatorListItem,
  OperatorDetail,
  ReviewResult,
  MachineryCatalogResponse,
  MachinerySubcategory,
  Campaign,
  CampaignSimulation,
  CampaignVocabulary,
  CampaignVersion,
  CampaignWrite,
  FeeRule,
  FeeRuleSimulation,
  FeeRuleWrite,
  RuleFieldCatalogue,
  VendorWarehouse,
  VendorWarehouseWrite,
  DeliveryCharge,
  DeliveryPreviewRequest,
  DeliveryQuotePreview,
  DeliveryRateCard,
  DeliveryRateCardWrite,
  DeliveryVehicleType,
  DeliveryVehicleTypeWrite,
  RentalSkuOption,
  FaqAdmin,
  CustomerOrderWebhook,
  FaqWrite,
  HelpLegalVocabulary,
  LegalDocumentAdmin,
  LegalDocumentWrite,
  ReferralProgramAdmin,
  ReferralProgramWrite,
} from "./types";

import { ApiError, apiFetch } from "./http";

export { ApiError };

const TOKEN_KEY = "l2b_admin_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  return apiFetch<T>(path, { method, body, token: auth ? getToken() : null });
}

export const authApi = {
  sendOtp: (phone: string) =>
    request<{ success: boolean; message: string }>("/auth/send-otp", {
      method: "POST",
      body: { phone },
      auth: false,
    }),
  verifyOtp: (phone: string, otpCode: string) =>
    request<LoginResponse>("/auth/verify-otp", {
      method: "POST",
      body: { phone, otp_code: otpCode, fcm_token: "admin-web" },
      auth: false,
    }),
};

export const vendorApi = {
  list: (params: { category?: string; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.status) qs.set("status", params.status);
    qs.set("limit", "200");
    return request<VendorListItem[]>(`/rentals/admin/vendors?${qs.toString()}`);
  },
  detail: (userId: string) =>
    request<VendorDetail>(`/rentals/admin/vendors/${userId}`),

  approveMachineDoc: (userId: string, machineId: string, doc: "rc" | "insurance" | "tpi") =>
    request<ReviewResult>(
      `/rentals/admin/vendors/${userId}/machines/${machineId}/${doc}/approve`,
      { method: "POST" }
    ),
  rejectMachineDoc: (
    userId: string,
    machineId: string,
    doc: "rc" | "insurance" | "tpi",
    reason: string
  ) =>
    request<ReviewResult>(
      `/rentals/admin/vendors/${userId}/machines/${machineId}/${doc}/reject`,
      { method: "POST", body: { rejection_reason: reason } }
    ),

  approveSkill: (userId: string, skillId: string) =>
    request<ReviewResult>(`/rentals/admin/vendors/${userId}/skills/${skillId}/approve`, {
      method: "POST",
    }),
  rejectSkill: (userId: string, skillId: string, reason: string) =>
    request<ReviewResult>(`/rentals/admin/vendors/${userId}/skills/${skillId}/reject`, {
      method: "POST",
      body: { rejection_reason: reason },
    }),

  approveKyc: (userId: string) =>
    request<ReviewResult>(`/rentals/admin/vendors/${userId}/kyc/approve`, { method: "POST" }),
  rejectKyc: (userId: string, reason: string) =>
    request<ReviewResult>(`/rentals/admin/vendors/${userId}/kyc/reject`, {
      method: "POST",
      body: { rejection_reason: reason },
    }),

  approveCompanyKyc: (userId: string) =>
    request<ReviewResult>(`/rentals/admin/vendors/${userId}/company-kyc/approve`, {
      method: "POST",
    }),
  rejectCompanyKyc: (userId: string, reason: string) =>
    request<ReviewResult>(`/rentals/admin/vendors/${userId}/company-kyc/reject`, {
      method: "POST",
      body: { rejection_reason: reason },
    }),

  approveFinal: (userId: string) =>
    request<ReviewResult>(`/rentals/admin/vendors/${userId}/approve`, { method: "POST" }),
  rejectFinal: (userId: string, reason: string) =>
    request<ReviewResult>(`/rentals/admin/vendors/${userId}/reject`, {
      method: "POST",
      body: { rejection_reason: reason },
    }),

  getWarehouse: (userId: string) =>
    request<{ success: boolean; data: VendorWarehouse | null }>(
      `/rentals/admin/vendors/${userId}/warehouse`
    ).then((res) => res.data),
  setWarehouse: (userId: string, warehouse: VendorWarehouseWrite) =>
    request<{ success: boolean; data: VendorWarehouse }>(
      `/rentals/admin/vendors/${userId}/warehouse`,
      { method: "PUT", body: warehouse }
    ).then((res) => res.data),
};

export const operatorApi = {
  list: (params: { status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    qs.set("limit", "200");
    return request<OperatorListItem[]>(`/rentals/admin/operators?${qs.toString()}`);
  },
  detail: (userId: string) =>
    request<OperatorDetail>(`/rentals/admin/operators/${userId}`),

  approveSkill: (userId: string, skillId: string) =>
    request<ReviewResult>(`/rentals/admin/operators/${userId}/skills/${skillId}/approve`, {
      method: "POST",
    }),
  rejectSkill: (userId: string, skillId: string, reason: string) =>
    request<ReviewResult>(`/rentals/admin/operators/${userId}/skills/${skillId}/reject`, {
      method: "POST",
      body: { rejection_reason: reason },
    }),

  approveKyc: (userId: string) =>
    request<ReviewResult>(`/rentals/admin/operators/${userId}/kyc/approve`, { method: "POST" }),
  rejectKyc: (userId: string, reason: string) =>
    request<ReviewResult>(`/rentals/admin/operators/${userId}/kyc/reject`, {
      method: "POST",
      body: { rejection_reason: reason },
    }),

  approveTpi: (userId: string) =>
    request<ReviewResult>(`/rentals/admin/operators/${userId}/tpi/approve`, { method: "POST" }),
  rejectTpi: (userId: string, reason: string) =>
    request<ReviewResult>(`/rentals/admin/operators/${userId}/tpi/reject`, {
      method: "POST",
      body: { rejection_reason: reason },
    }),

  approveFinal: (userId: string) =>
    request<ReviewResult>(`/rentals/admin/operators/${userId}/approve`, { method: "POST" }),
  rejectFinal: (userId: string, reason: string) =>
    request<ReviewResult>(`/rentals/admin/operators/${userId}/reject`, {
      method: "POST",
      body: { rejection_reason: reason },
    }),
};

export interface LegacyPendingVendor {
  user_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string | null;
  onboarding_status: string;
}

export const legacyAdminApi = {
  listPending: () =>
    request<LegacyPendingVendor[]>("/admin/vendors/pending?limit=200&offset=0"),
  reviewMachineDocument: (
    userId: string,
    machineId: string,
    docType: "rc" | "insurance" | "tpi",
    status: "verified" | "rejected",
    rejectionReason?: string
  ) =>
    request<ReviewResult>(`/admin/vendors/${userId}/machines/${machineId}/review`, {
      method: "POST",
      body: { doc_type: docType, status, rejection_reason: rejectionReason ?? null },
    }),
  approve: (userId: string) =>
    request<ReviewResult>(`/admin/vendors/${userId}/approve`, { method: "POST" }),
  reject: (userId: string, reason: string) =>
    request<ReviewResult>(`/admin/vendors/${userId}/reject`, {
      method: "POST",
      body: { reason },
    }),
};

export const machineryApi = {
  getCatalog: async (): Promise<MachinerySubcategory[]> => {
    const res = await request<MachineryCatalogResponse>("/machinery/catalog");
    return res.data.subcategories;
  },
};

const FINANCE = "/admin/finance";

export const feeRuleApi = {
  catalogue: (context = "fee_rule") =>
    request<RuleFieldCatalogue>(`${FINANCE}/rule-fields?context=${context}`),
  list: (status?: string) =>
    request<FeeRule[]>(`${FINANCE}/fee-rules${status ? `?status=${status}` : ""}`),
  get: (ruleId: string) => request<FeeRule>(`${FINANCE}/fee-rules/${ruleId}`),
  createDraft: (rule: FeeRuleWrite) =>
    request<FeeRule>(`${FINANCE}/fee-rules`, { method: "POST", body: rule }),
  updateDraft: (ruleId: string, rule: FeeRuleWrite) =>
    request<FeeRule>(`${FINANCE}/fee-rules/${ruleId}`, { method: "PUT", body: rule }),
  activate: (ruleId: string) =>
    request<FeeRule>(`${FINANCE}/fee-rules/${ruleId}/activate`, { method: "POST" }),
  remove: (ruleId: string) =>
    request<void>(`${FINANCE}/fee-rules/${ruleId}`, { method: "DELETE" }),
  pause: (ruleId: string) =>
    request<FeeRule>(`${FINANCE}/fee-rules/${ruleId}/pause`, { method: "POST" }),
  archive: (ruleId: string) =>
    request<FeeRule>(`${FINANCE}/fee-rules/${ruleId}/archive`, { method: "POST" }),
  simulate: (rule: FeeRuleWrite, sampleSize = 100, replaceExistingCode = true) =>
    request<FeeRuleSimulation>(`${FINANCE}/fee-rules/simulate`, {
      method: "POST",
      body: { rule, sample_size: sampleSize, replace_existing_code: replaceExistingCode },
    }),
};

export const deliveryApi = {
  vehicleTypes: (includeInactive = false) =>
    request<DeliveryVehicleType[]>(
      `${FINANCE}/delivery/vehicle-types?include_inactive=${includeInactive}`
    ),
  vehicleIcons: () => request<string[]>(`${FINANCE}/delivery/vehicle-icons`),
  createVehicle: (vehicle: DeliveryVehicleTypeWrite & { code: string }) =>
    request<DeliveryVehicleType>(`${FINANCE}/delivery/vehicle-types`, {
      method: "POST",
      body: vehicle,
    }),
  updateVehicle: (code: string, vehicle: DeliveryVehicleTypeWrite) =>
    request<DeliveryVehicleType>(`${FINANCE}/delivery/vehicle-types/${code}`, {
      method: "PUT",
      body: vehicle,
    }),
  resequenceVehicles: (codes: string[]) =>
    request<DeliveryVehicleType[]>(`${FINANCE}/delivery/vehicle-types/sequence`, {
      method: "PUT",
      body: { codes },
    }),
  rentalSkus: () =>
    request<RentalSkuOption[]>(`${FINANCE}/delivery/rental-skus`),
  list: (vehicleTypeCode?: string, rentalSkuId?: number | null, status?: string) => {
    const query = new URLSearchParams();
    if (vehicleTypeCode) query.set("vehicle_type_code", vehicleTypeCode);
    if (rentalSkuId !== undefined && rentalSkuId !== null) query.set("rental_sku_id", String(rentalSkuId));
    if (status) query.set("status", status);
    const suffix = query.toString() ? `?${query}` : "";
    return request<DeliveryRateCard[]>(`${FINANCE}/delivery/rate-cards${suffix}`);
  },
  get: (rateCardId: string) =>
    request<DeliveryRateCard>(`${FINANCE}/delivery/rate-cards/${rateCardId}`),
  createDraft: (card: DeliveryRateCardWrite) =>
    request<DeliveryRateCard>(`${FINANCE}/delivery/rate-cards`, { method: "POST", body: card }),
  updateDraft: (rateCardId: string, card: DeliveryRateCardWrite) =>
    request<DeliveryRateCard>(`${FINANCE}/delivery/rate-cards/${rateCardId}`, { method: "PUT", body: card }),
  replaceCharges: (rateCardId: string, charges: DeliveryCharge[]) =>
    request<DeliveryRateCard>(`${FINANCE}/delivery/rate-cards/${rateCardId}/charges`, {
      method: "PUT",
      body: charges,
    }),
  setStatus: (rateCardId: string, status: string) =>
    request<DeliveryRateCard>(`${FINANCE}/delivery/rate-cards/${rateCardId}/status`, {
      method: "POST",
      body: { status },
    }),
  preview: (body: DeliveryPreviewRequest) =>
    request<DeliveryQuotePreview>(`${FINANCE}/delivery/rate-cards/preview`, {
      method: "POST",
      body,
    }),
};

export const campaignApi = {
  vocabulary: () => request<CampaignVocabulary>(`${FINANCE}/campaign-vocabulary`),
  list: (status?: string) =>
    request<Campaign[]>(`${FINANCE}/campaigns${status ? `?status=${status}` : ""}`),
  createDraft: (campaign: CampaignWrite) =>
    request<Campaign>(`${FINANCE}/campaigns`, { method: "POST", body: campaign }),
  getVersion: (campaignId: string, versionId: string) =>
    request<CampaignVersion>(
      `${FINANCE}/campaigns/${campaignId}/versions/${versionId}`
    ),
  updateVersion: (campaignId: string, versionId: string, campaign: CampaignWrite) =>
    request<Campaign>(`${FINANCE}/campaigns/${campaignId}/versions/${versionId}`, {
      method: "PUT",
      body: campaign,
    }),
  remove: (campaignId: string) =>
    request<void>(`${FINANCE}/campaigns/${campaignId}`, { method: "DELETE" }),
  activate: (campaignId: string, versionId?: string) =>
    request<Campaign>(
      `${FINANCE}/campaigns/${campaignId}/activate` +
        (versionId ? `?version_id=${versionId}` : ""),
      { method: "POST" }
    ),
  pause: (campaignId: string) =>
    request<Campaign>(`${FINANCE}/campaigns/${campaignId}/pause`, { method: "POST" }),
  resume: (campaignId: string) =>
    request<Campaign>(`${FINANCE}/campaigns/${campaignId}/resume`, { method: "POST" }),
  setStatus: (campaignId: string, status: string) =>
    request<Campaign>(`${FINANCE}/campaigns/${campaignId}/status?status=${status}`, {
      method: "POST",
    }),
  simulate: (campaign: CampaignWrite, sampleSize = 100) =>
    request<CampaignSimulation>(`${FINANCE}/campaigns/simulate`, {
      method: "POST",
      body: { campaign, sample_size: sampleSize },
    }),
};

export const kycDocumentApi = {
  approve: (userId: string, documentId: string) =>
    request<ReviewResult>(
      `/rentals/admin/documents/${documentId}/approve?user_id=${encodeURIComponent(userId)}`,
      { method: "POST" }
    ),
  reject: (userId: string, documentId: string, reason: string) =>
    request<ReviewResult>(
      `/rentals/admin/documents/${documentId}/reject?user_id=${encodeURIComponent(userId)}`,
      { method: "POST", body: { rejection_reason: reason } }
    ),
};

const HELP_LEGAL = "/admin/help-legal";

export const integrationApi = {
  getCustomerOrderWebhook: () =>
    request<CustomerOrderWebhook>("/admin/integrations/webhooks/customer-order"),
  setSecret: (secret: string) =>
    request<CustomerOrderWebhook>("/admin/integrations/webhooks/customer-order/secret", {
      method: "PUT",
      body: { secret },
    }),
  rotateSecret: () =>
    request<CustomerOrderWebhook>(
      "/admin/integrations/webhooks/customer-order/secret/rotate",
      { method: "POST" }
    ),
};

export const helpLegalApi = {
  vocabulary: () => request<HelpLegalVocabulary>(`${HELP_LEGAL}/vocabulary`),

  listFaqs: () => request<FaqAdmin[]>(`${HELP_LEGAL}/faqs`),
  createFaq: (faq: FaqWrite) =>
    request<FaqAdmin>(`${HELP_LEGAL}/faqs`, { method: "POST", body: faq }),
  updateFaq: (faqId: string, faq: FaqWrite) =>
    request<FaqAdmin>(`${HELP_LEGAL}/faqs/${faqId}`, { method: "PUT", body: faq }),
  deleteFaq: (faqId: string) =>
    request<void>(`${HELP_LEGAL}/faqs/${faqId}`, { method: "DELETE" }),
  reorderFaqs: (orderedIds: string[]) =>
    request<FaqAdmin[]>(`${HELP_LEGAL}/faqs/order/sequence`, {
      method: "PUT",
      body: { ordered_ids: orderedIds },
    }),

  listDocuments: (docType?: string) =>
    request<LegalDocumentAdmin[]>(
      `${HELP_LEGAL}/documents${docType ? `?doc_type=${docType}` : ""}`
    ),
  createDocument: (document: LegalDocumentWrite) =>
    request<LegalDocumentAdmin>(`${HELP_LEGAL}/documents`, {
      method: "POST",
      body: document,
    }),
  updateDocument: (documentId: string, document: LegalDocumentWrite) =>
    request<LegalDocumentAdmin>(`${HELP_LEGAL}/documents/${documentId}`, {
      method: "PUT",
      body: document,
    }),
  deleteDocument: (documentId: string) =>
    request<void>(`${HELP_LEGAL}/documents/${documentId}`, { method: "DELETE" }),

  listPrograms: () => request<ReferralProgramAdmin[]>(`${HELP_LEGAL}/referral-programs`),
  createProgram: (program: ReferralProgramWrite) =>
    request<ReferralProgramAdmin>(`${HELP_LEGAL}/referral-programs`, {
      method: "POST",
      body: program,
    }),
  updateProgram: (programId: string, program: ReferralProgramWrite) =>
    request<ReferralProgramAdmin>(`${HELP_LEGAL}/referral-programs/${programId}`, {
      method: "PUT",
      body: program,
    }),
  deleteProgram: (programId: string) =>
    request<void>(`${HELP_LEGAL}/referral-programs/${programId}`, { method: "DELETE" }),
};
