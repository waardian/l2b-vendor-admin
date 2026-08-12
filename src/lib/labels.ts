// Plain-English names for the enum values the API speaks in.
//
// Anything missing falls back to a title-cased version of the raw value, so a
// reward type or period added on the backend still shows up readably without a
// web release — which is the whole point of the vocabulary endpoint.

const LABELS: Record<string, string> = {
  // Fee rule — what kind of line it produces
  deduction: "Deduction — reduces the payout",
  tax: "Tax",
  bata: "Bata / allowance",
  adjustment: "Manual adjustment",

  // Fee rule — how the amount is worked out
  percent: "A percentage",
  flat: "A fixed amount",
  slab: "Tiered by amount",
  per_unit: "An amount per unit",

  // Fee rule — what the percentage is taken from
  gross: "the order total",
  net_after_deductions: "what is left after earlier deductions",
  "component:COMMISSION": "the commission amount",
  "unit:hours_booked": "hours booked",
  "unit:actual_km": "kilometres travelled",
  "unit:days": "days on site",

  // Fee rule — clash handling
  first_match: "Only the top-priority rule applies",
  all_match: "Every matching rule stacks",

  // Rounding
  half_up: "Normal (₹0.50 rounds up)",
  half_even: "Banker's rounding",
  floor: "Always round down",
  ceiling: "Always round up",

  // Who gets paid
  rental_vendor_company: "Rental vendor (company)",
  rental_vendor_individual: "Rental vendor (individual)",
  material_vendor: "Material vendor",
  operator_company: "Operator on a company's team",
  operator_independent: "Independent operator",

  // Order and payment
  rental_booking: "Equipment rental",
  material_order: "Material order",
  online: "Paid online",
  cod: "Cash on delivery",

  // Campaign — what is counted
  completed_orders: "Jobs completed",
  gross_earnings: "Total order value earned (₹)",
  net_earnings: "Take-home earnings (₹)",

  // Campaign — when progress resets
  lifetime: "Never resets",
  daily: "Resets every day",
  weekly: "Resets every week",
  monthly: "Resets every month",
  rolling_days: "Rolling window of N days",
  fixed_range: "One fixed date range",
  calendar: "Calendar dates",
  enrollment: "From each vendor's first job",

  // Campaign — the reward
  flat_bonus_once: "One-off bonus (₹)",
  flat_bonus_per_order: "Bonus on every job (₹)",
  percent_of_order: "% of the order value",
  percent_of_net: "% of take-home",
  commission_discount_pct: "Cut commission by %",
  commission_discount_flat: "Cut commission by ₹",
  commission_waiver: "Charge no commission",

  // Campaign — which jobs the reward lands on
  threshold_order_only: "Only the job that hits the target",
  subsequent_orders: "Every job after the target",
  retroactive_period: "Every job in the period, backdated",

  // Campaign — how it is paid
  with_settlement: "Added to that job's payout",
  immediate_credit: "Credited to the wallet right away",
  end_of_period_batch: "Paid in one batch when the period ends",

  // Budget
  stop: "Stop awarding",
  continue: "Keep awarding anyway",
  notify: "Keep awarding but alert us",

  // Condition operators
  eq: "is",
  ne: "is not",
  in: "is one of",
  not_in: "is not one of",
  gt: "is more than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  between: "is between",
  contains: "contains",
  starts_with: "starts with",
  is_null: "is empty",
  is_not_null: "is not empty",

  // Statuses
  draft: "Draft",
  active: "Live",
  paused: "Paused",
  archived: "Archived",
  scheduled: "Scheduled",
  exhausted: "Budget spent",
  ended: "Ended",
};

export function humanise(value: string | null | undefined): string {
  if (!value) return "—";
  if (LABELS[value]) return LABELS[value];
  const cleaned = value.replace(/^(unit|component|field):/, "").replace(/[_-]+/g, " ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function isPercentReward(rewardType: string): boolean {
  return rewardType.includes("percent") || rewardType.endsWith("_pct");
}

export function isCommissionReward(rewardType: string): boolean {
  return rewardType.startsWith("commission_");
}

/** One sentence describing what a fee rule will actually do. */
export function describeFeeRule(rule: {
  calc_method: string;
  base_expr: string;
  rate_value?: string | null;
  payee_types?: string[];
  source_types?: string[];
  payment_modes?: string[];
}): string {
  const amount =
    rule.calc_method === "percent"
      ? `${rule.rate_value || 0}% of ${humanise(rule.base_expr)}`
      : rule.calc_method === "flat"
        ? `₹${rule.rate_value || 0}`
        : rule.calc_method === "per_unit"
          ? `₹${rule.rate_value || 0} per ${humanise(rule.base_expr)}`
          : `a tiered amount on ${humanise(rule.base_expr)}`;

  const who = rule.payee_types?.length
    ? rule.payee_types.map(humanise).join(" and ")
    : "every payee";
  const what = rule.source_types?.length
    ? rule.source_types.map(humanise).join(" and ")
    : "every order";
  const how = rule.payment_modes?.length
    ? ` paid by ${rule.payment_modes.map(humanise).join(" or ").toLowerCase()}`
    : "";

  return `Take ${amount} from ${who} on ${what}${how}.`;
}

/** One sentence describing what a reward tier will actually do. */
export function describeTier(
  tier: {
    threshold_from: string;
    reward_type: string;
    reward_value: string;
    applies_to: string;
    per_period_cap?: string | null;
  },
  metric: string
): string {
  const target = `${tier.threshold_from} ${humanise(metric).toLowerCase()}`;

  const reward = isCommissionReward(tier.reward_type)
    ? tier.reward_type === "commission_waiver"
      ? "charge no commission"
      : `cut commission by ${tier.reward_value}${
          isPercentReward(tier.reward_type) ? "%" : " rupees"
        }`
    : isPercentReward(tier.reward_type)
      ? `pay a bonus of ${tier.reward_value}% of the order`
      : `pay a bonus of ₹${tier.reward_value}`;

  const when =
    tier.applies_to === "threshold_order_only"
      ? "on the job that hits the target"
      : tier.applies_to === "subsequent_orders"
        ? "on every job after that"
        : "on every job in the period, backdated";

  const cap = tier.per_period_cap
    ? `, up to ₹${tier.per_period_cap} per period`
    : "";

  return `Once they reach ${target}, ${reward} ${when}${cap}.`;
}
