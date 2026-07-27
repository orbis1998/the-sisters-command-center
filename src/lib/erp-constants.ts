export const monthlyExpenseCategories = [
  { value: "salary", label: "Salaire" },
  { value: "rent", label: "Loyer" },
  { value: "marketing", label: "Marketing" },
  { value: "subscription", label: "Abonnement" },
  { value: "transport_taxi", label: "Transport / Taxi" },
  { value: "shipping", label: "Expédition" },
  { value: "taxes", label: "Impôts" },
  { value: "unexpected", label: "Imprévu" },
] as const;

/** @deprecated use monthlyExpenseCategories */
export const managerExpenseCategories = [
  ...monthlyExpenseCategories,
  { value: "stock_purchase", label: "Achat du stock" },
  { value: "investment", label: "Investissement" },
] as const;

export const managerInventoryItems = [
  { value: "mass_gainer_2kg", label: "Mass Gainer 2kg", unit: "kg" },
  { value: "mass_gainer_1kg", label: "Mass Gainer 1kg", unit: "kg" },
  { value: "super_grow_800g", label: "Super Grow 800g", unit: "g" },
  { value: "calorie_boost_800g", label: "Calorie Boost 800g", unit: "g" },
  { value: "peanut_butter_300g", label: "Peanut Butter 300g", unit: "g" },
  { value: "poudre_secret", label: "Poudre Secret", unit: "unit" },
  { value: "emballage_livraison_petit", label: "Emballages Livraison Petit", unit: "unit" },
  { value: "emballage_livraison_grand", label: "Emballages Livraison Grand", unit: "unit" },
] as const;

export function stockStatus(qty: number, minQty: number) {
  if (qty <= 0) return "Rupture";
  if (qty <= minQty) return "À réapprovisionner";
  if (qty <= minQty * 2) return "Bas";
  return "En stock";
}
