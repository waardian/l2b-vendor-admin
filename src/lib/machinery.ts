import type { MachinerySubcategory } from "./types";

export interface ResolvedMachinery {
  categoryName: string | null;
  subcategoryName: string | null;
  capacityLabel: string | null;
  variantLabel: string | null;
}

/** Same lookup shape as the iOS Rental Machine Listing screen: subcategory ->
 * capacity -> variant, each resolved by id against the fetched catalog. */
export function resolveMachinery(
  catalog: MachinerySubcategory[],
  subcategoryId: number,
  capacityId?: number | null,
  variantId?: number | null
): ResolvedMachinery {
  if (!Array.isArray(catalog)) {
    return {
      categoryName: null,
      subcategoryName: null,
      capacityLabel: null,
      variantLabel: null,
    };
  }
  const subcategory = catalog.find((s) => s.id === subcategoryId);
  const capacity = subcategory?.capacities?.find((c) => c.id === capacityId);
  const variant = capacity?.variants?.find((v) => v.id === variantId);
  return {
    categoryName: subcategory?.category_name ?? null,
    subcategoryName: subcategory?.name ?? null,
    capacityLabel: capacity?.label ?? null,
    variantLabel: variant?.label ?? null,
  };
}

/** "pan_card" -> "Pan Card", "aadhaar_front" -> "Aadhaar Front" */
export function formatDocumentType(documentType: string): string {
  return documentType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
