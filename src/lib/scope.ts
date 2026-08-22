// The "who is this for" vocabulary, shared by the deduction rules and the
// incentive campaigns so both pages offer the same choices in the same order.
//
// Deliberately narrower than the backend's full enums: an admin aims a charge
// or a reward at the partners and order types the platform actually books, not
// at internal sources like manual settlements.

export const PAYEE_TYPES = [
  "rental_vendor_company",
  "rental_vendor_individual",
  "material_vendor",
  "operator_company",
  "operator_independent",
];

// `material_sub_order`, not `material_order`: a materials settlement is raised
// against the *vendor's slice*, never the customer's whole basket. A rule or
// campaign scoped to the basket matches nothing and quietly never fires.
export const SOURCE_TYPES = ["rental_booking", "material_sub_order"];

export const PAYMENT_MODES = ["online", "cod"];
