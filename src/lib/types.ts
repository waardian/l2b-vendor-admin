// Mirrors the shapes returned by l2b-backend's /rentals/admin, /admin, and /auth
// endpoints. Kept intentionally loose (lots of optional/nullable fields) since this
// is a test/ops tool, not the source of truth for the schema.

export interface LoginResponse {
  success: boolean;
  message?: string | null;
  is_new_user: boolean;
  user_id?: string | null;
  role?: string | null;
  profile_category?: string | null;
  onboarding_status?: string | null;
  completed_steps?: Record<string, boolean>;
  access_token?: string | null;
  refresh_token?: string | null;
}

export interface VendorListItem {
  user_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  onboarding_status: string;
  vendor_profile_id: string;
  vendor_category: string;
  is_company: boolean;
  company_type: string | null;
  machine_count: number;
  has_skills: boolean;
  onboarding_step: string;
  vendor_code: string | null;
}

export interface OperatorListItem {
  user_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  onboarding_status: string;
  operator_profile_id: string;
  operator_category: string;
  is_associated_with_company: boolean;
  associated_vendor_profile_id: string | null;
  company_id: string | null;
  onboarding_step: string;
}

export interface DocumentSummary {
  id: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  file_url: string;
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string | null;
}

export interface BasicInfo {
  user_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string | null;
  onboarding_status: string;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  profile_photo_url: string | null;
}

export interface VendorProfileDetail {
  id: string;
  vendor_category: string;
  is_company: boolean;
  company_type: string | null;
  machine_count: number;
  has_skills: boolean;
  onboarding_step: string;
  vendor_code: string | null;
}

export interface CompanyDetail {
  id: string;
  company_code: string;
  company_name: string | null;
  company_type: string;
  is_active: boolean;
}

export interface MachineDetail {
  id: string;
  subcategory_id: number;
  capacity_id: number;
  variant_id: number;
  registration_serial_no: string;
  status: string;
  rc_status: string;
  insurance_status: string;
  tpi_status: string;
  rc_rejection_reason: string | null;
  insurance_rejection_reason: string | null;
  tpi_rejection_reason: string | null;
  documents: DocumentSummary[];
}

export interface SkillDetail {
  id: string;
  subcategory_id: number;
  capacity_id: number;
  status: string;
  rejection_reason: string | null;
}

export interface KycDetail {
  id: string;
  overall_status: string;
  rejection_reason: string | null;
  aadhaar_number?: string | null;
  pan_number?: string | null;
  bank_name: string;
  bank_branch_name: string;
  ifsc_code: string;
  bank_linked_mobile: string;
  upi_id: string | null;
  trade_license_number?: string | null;
  gst_registered?: boolean | null;
  company_gst_number?: string | null;
  company_pan_number?: string | null;
  dl_number?: string;
}

// ---------------------------------------------------------------------------
// Digio (third-party OCR/KYC provider) — values the provider machine-extracted
// from an uploaded document, as opposed to values the user typed in themselves.
// ---------------------------------------------------------------------------

/** One value inside a Digio `extracted_data` blob. Digio returns mostly flat
 * scalars, but some document types nest (a DL carries `address_information`), so
 * the shape is recursive and the concrete keys vary per document type. Consumers
 * narrow at render time rather than assuming a fixed schema. */
export type DigioExtractedValue =
  | string
  | number
  | boolean
  | null
  | DigioExtractedValue[]
  | { [key: string]: DigioExtractedValue };

export interface DigioVerification {
  id: string;
  /** e.g. "dl_ocr", "pan_ocr", "aadhaar_ocr", "cheque_ocr", "gst_verify". */
  verification_type: string;
  /** Human-readable name of the document, e.g. "Driving License". */
  label: string;
  /** One of "verified" | "failed" | "pending" | "skipped" — kept as a string
   * since the backend owns this vocabulary and may extend it. */
  result: string;
  /** Digio's own request id — the handle support uses to trace a record back. */
  digio_request_id: string | null;
  created_at: string | null;
  id_number: string | null;
  holder_name: string | null;
  /** Null on rows created before the backend started persisting the raw payload. */
  extracted_data: Record<string, DigioExtractedValue> | null;
}

export interface VendorDetail {
  basic_info: BasicInfo;
  profile: VendorProfileDetail | null;
  company: CompanyDetail | null;
  machines: MachineDetail[];
  skills: SkillDetail[];
  kyc: KycDetail | null;
  company_kyc: KycDetail | null;
  documents: DocumentSummary[];
  /** Absent on older records and on users who never went through Digio KYC. */
  digio_verifications?: DigioVerification[];
}

export interface OperatorProfileDetail {
  id: string;
  operator_category: string;
  is_associated_with_company: boolean;
  associated_vendor_profile_id: string | null;
  company_id: string | null;
  onboarding_step: string;
}

export interface OperatorDetail {
  basic_info: BasicInfo;
  profile: OperatorProfileDetail | null;
  skills: SkillDetail[];
  kyc: KycDetail | null;
  tpi: DocumentSummary | null;
  documents: DocumentSummary[];
  /** Absent on older records and on users who never went through Digio KYC. */
  digio_verifications?: DigioVerification[];
}

export interface ReviewResult {
  onboarding_status?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Machinery catalog (GET /machinery/catalog) — used to resolve subcategory_id /
// capacity_id / variant_id on machines & skills into human-readable labels.
// ---------------------------------------------------------------------------

export interface MachineryVariant {
  id: number;
  label: string;
}

export interface MachineryCapacity {
  id: number;
  label: string;
  variants: MachineryVariant[];
}

export interface MachinerySubcategory {
  id: number;
  name: string;
  category_name: string;
  capacities: MachineryCapacity[];
}

export interface MachineryCatalogResponse {
  success: boolean;
  message?: string | null;
  data: { subcategories: MachinerySubcategory[] };
}

// ---------------------------------------------------------------------------
// Finance: deduction rules and incentive campaigns
//
// The condition tree and the field catalogue are deliberately loose: the admin
// builder renders from whatever /admin/finance/rule-fields returns, so adding a
// targetable field on the backend must not require a change here.
// ---------------------------------------------------------------------------

export interface RuleField {
  field_key: string;
  label: string;
  data_type: string;
  operators: string[];
  ui_component: string;
  options_source: string | null;
  group_label: string | null;
  display_order: number;
}

export interface RuleFieldCatalogue {
  context: string;
  fields: RuleField[];
}

export type ConditionLeaf = {
  field: string;
  op: string;
  value?: unknown;
};

export type ConditionNode =
  | ConditionLeaf
  | { all: ConditionNode[] }
  | { any: ConditionNode[] }
  | Record<string, never>;

export interface SlabBand {
  threshold_from: string;
  threshold_to: string | null;
  calc_method: string;
  value: string;
}

export interface FeeRule {
  id: string;
  code: string;
  version: number;
  name: string;
  kind: string;
  component_code: string;
  rule_group: string | null;
  selection_strategy: string;
  priority: number;
  calc_method: string;
  base_expr: string;
  rate_value: string | null;
  slabs: SlabBand[];
  min_amount: string | null;
  max_amount: string | null;
  round_mode: string;
  round_to: string;
  transfer_to_payee_role: string | null;
  discountable: boolean;
  payee_types: string[];
  source_types: string[];
  payment_modes: string[];
  conditions: ConditionNode;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
}

export interface FeeRuleWrite {
  code: string;
  name: string;
  kind: string;
  component_code: string;
  calc_method: string;
  base_expr: string;
  priority: number;
  rule_group?: string | null;
  selection_strategy?: string;
  rate_value?: string | null;
  slabs?: SlabBand[];
  min_amount?: string | null;
  max_amount?: string | null;
  round_mode?: string;
  round_to?: string;
  discountable?: boolean;
  payee_types?: string[];
  source_types?: string[];
  payment_modes?: string[];
  conditions?: ConditionNode;
}

export interface SimulatedRow {
  source_id: string;
  payee_type: string;
  payment_mode: string;
  gross_amount: string;
  baseline_net: string;
  simulated_net: string;
  net_delta: string;
}

export interface FeeRuleSimulation {
  sample_size: number;
  settlements_changed: number;
  total_baseline_net: string;
  total_simulated_net: string;
  total_net_delta: string;
  total_deduction_delta: string;
  largest_increase: SimulatedRow | null;
  largest_decrease: SimulatedRow | null;
  changed_rows: SimulatedRow[];
}

export interface CampaignVocabulary {
  metrics: string[];
  reward_types: { value: string; kind: "modifier" | "bonus" }[];
  applies_to: string[];
  period_types: string[];
  period_anchors: string[];
  payout_modes: string[];
  operators: string[];
  audience_fields: RuleField[];
  metric_filter_fields: RuleField[];
}

export interface CampaignTierWrite {
  threshold_from: string;
  reward_type: string;
  reward_value: string;
  applies_to: string;
  label: string;
  threshold_to?: string | null;
  per_order_cap?: string | null;
  per_period_cap?: string | null;
  max_awards?: number | null;
  min_order_amount?: string | null;
}

export interface CampaignWrite {
  code: string;
  name: string;
  metric: string;
  period_type: string;
  starts_at: string;
  tiers: CampaignTierWrite[];
  audience?: ConditionNode;
  metric_filter?: ConditionNode;
  period_length?: number | null;
  ends_at?: string | null;
  payout_mode?: string;
  stackable?: boolean;
  stack_group?: string | null;
  priority?: number;
  max_awards_per_period?: number | null;
  max_awards_lifetime?: number | null;
  per_payee_period_cap?: string | null;
  per_payee_lifetime_cap?: string | null;
  total_budget?: string | null;
  on_budget_exhausted?: string;
}

export interface Campaign {
  id: string;
  code: string;
  name: string;
  status: string;
  active_version_id: string | null;
  latest_version_id: string | null;
  latest_version: number | null;
  total_budget: string | null;
  budget_consumed: string;
  on_budget_exhausted: string;
}

export interface SimulatedAward {
  source_id: string;
  payee_type: string;
  order_index: number;
  metric_before: string;
  gross_amount: string;
  reward_type: string;
  amount: string;
  tier_label: string;
}

export interface CampaignSimulation {
  sample_size: number;
  payees_reached: number;
  awards_granted: number;
  total_bonus: string;
  total_commission_discount: string;
  average_per_award: string;
  largest_award: SimulatedAward | null;
  awards: SimulatedAward[];
}

export interface CampaignTier {
  id: string;
  tier_order: number;
  threshold_from: string;
  threshold_to: string | null;
  reward_type: string;
  reward_value: string;
  applies_to: string;
  per_order_cap: string | null;
  per_period_cap: string | null;
  max_awards: number | null;
  min_order_amount: string | null;
  label: string;
}

export interface CampaignVersion {
  id: string;
  version: number;
  metric: string;
  metric_filter: ConditionNode;
  audience: ConditionNode;
  period_type: string;
  period_length: number | null;
  period_anchor: string;
  week_start_day: number | null;
  timezone: string;
  payout_mode: string;
  payout_hold_days: number;
  clawback_on_reversal: boolean;
  stackable: boolean;
  stack_group: string | null;
  priority: number;
  max_awards_per_period: number | null;
  max_awards_lifetime: number | null;
  per_payee_period_cap: string | null;
  per_payee_lifetime_cap: string | null;
  starts_at: string;
  ends_at: string | null;
  tiers: CampaignTier[];
}
