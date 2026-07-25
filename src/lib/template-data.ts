// Données calquées sur les modèles réels de The Sisters Africa :
// - Ultimate Bookkeeping (TRANSACTIONS / MONTH / QUARTER / ANNUAL / TAXES)
// - Pricing Calculator + Inventory Tracker (INVENTORY / PRICE CALCULATOR / PRICE LIST)
// - Order Tracker (ORDER TRACKER / SUMMARY)

/* ------------------------------------------------------------------ */
/* BOOKKEEPING                                                         */
/* ------------------------------------------------------------------ */

export const bookkeepingSetup = {
  currency: "USD",
  startDate: "2026-01-01",
  salesTaxPct: 16, // TVA RDC
  incomeCategories: [
    "Ventes détail",
    "Ventes gros",
    "Ventes en ligne",
    "Export RDC/Congo",
    "Prestations & formations",
  ],
  expenseCategories: [
    "Matières premières",
    "Emballage",
    "Salaires & charges",
    "Logistique",
    "Marketing",
    "Loyer & utilités",
    "Frais bancaires",
    "Divers",
  ],
  monthlyProfitGoals: [
    16000, 17000, 19000, 20000, 22000, 24000, 26000, 27000, 30000, 32000, 35000, 38000,
  ],
};

export type Transaction = {
  date: string;
  invoice: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  net: number;
  salesTax: number;
  otherFees: number;
  total: number;
  description: string;
  notes: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
};

export const transactions: Transaction[] = [
  { date: "2026-07-02", invoice: "INV-2026-0301", type: "INCOME", category: "Ventes gros", net: 2400, salesTax: 384, otherFees: 0, total: 2784, description: "Pharmacie Kinshasa Centre · Super Grow 1kg ×", notes: "Paiement virement", quarter: "Q3" },
  { date: "2026-07-03", invoice: "INV-2026-0302", type: "EXPENSE", category: "Matières premières", net: 3400, salesTax: 544, otherFees: 60, total: 4004, description: "Coop. Agricole Kongo · Soja bio 500kg", notes: "Lot #2026-142", quarter: "Q3" },
  { date: "2026-07-06", invoice: "INV-2026-0303", type: "INCOME", category: "Ventes en ligne", net: 968, salesTax: 154.88, otherFees: 29, total: 1093.88, description: "Boutique en ligne · commandes semaine 27", notes: "Frais Stripe inclus", quarter: "Q3" },
  { date: "2026-07-08", invoice: "INV-2026-0304", type: "EXPENSE", category: "Emballage", net: 1180, salesTax: 188.8, otherFees: 0, total: 1368.8, description: "Emballages Modernes · sachets kraft 5000u", notes: "", quarter: "Q3" },
  { date: "2026-07-10", invoice: "INV-2026-0305", type: "INCOME", category: "Export RDC/Congo", net: 3600, salesTax: 0, otherFees: 120, total: 3720, description: "Distributeur Brazzaville · palette mixte", notes: "Export exonéré TVA", quarter: "Q3" },
  { date: "2026-07-12", invoice: "INV-2026-0306", type: "EXPENSE", category: "Logistique", net: 620, salesTax: 99.2, otherFees: 0, total: 719.2, description: "TransCongo Logistics · expédition Brazzaville", notes: "", quarter: "Q3" },
  { date: "2026-07-14", invoice: "INV-2026-0307", type: "EXPENSE", category: "Marketing", net: 900, salesTax: 144, otherFees: 12, total: 1056, description: "Meta Ads · campagne Juillet", notes: "CPA $4.10", quarter: "Q3" },
  { date: "2026-07-16", invoice: "INV-2026-0308", type: "INCOME", category: "Ventes détail", net: 1420, salesTax: 227.2, otherFees: 0, total: 1647.2, description: "Boutique Gombe · ventes comptoir S28", notes: "", quarter: "Q3" },
  { date: "2026-07-18", invoice: "INV-2026-0309", type: "EXPENSE", category: "Salaires & charges", net: 7800, salesTax: 0, otherFees: 0, total: 7800, description: "Paie équipe production · Juillet", notes: "9 personnes", quarter: "Q3" },
  { date: "2026-07-20", invoice: "INV-2026-0310", type: "INCOME", category: "Ventes gros", net: 576, salesTax: 92.16, otherFees: 0, total: 668.16, description: "Supermarché Shoprite · Super Grow 500g ×48", notes: "", quarter: "Q3" },
  { date: "2026-07-21", invoice: "INV-2026-0311", type: "EXPENSE", category: "Loyer & utilités", net: 480, salesTax: 76.8, otherFees: 0, total: 556.8, description: "SNEL · électricité usine", notes: "", quarter: "Q3" },
  { date: "2026-07-22", invoice: "INV-2026-0312", type: "INCOME", category: "Prestations & formations", net: 750, salesTax: 120, otherFees: 0, total: 870, description: "Atelier nutrition · Coach Fitness Lubumbashi", notes: "", quarter: "Q3" },
];

export const monthSummary = [
  { month: "Jan", income: 42000, expenses: 26400, profit: 15600, goal: 16000 },
  { month: "Fév", income: 45800, expenses: 27100, profit: 18700, goal: 17000 },
  { month: "Mar", income: 51200, expenses: 29900, profit: 21300, goal: 19000 },
  { month: "Avr", income: 48600, expenses: 28800, profit: 19800, goal: 20000 },
  { month: "Mai", income: 54200, expenses: 30200, profit: 24000, goal: 22000 },
  { month: "Juin", income: 58900, expenses: 31700, profit: 27200, goal: 24000 },
  { month: "Juil", income: 62400, expenses: 33800, profit: 28600, goal: 26000 },
  { month: "Aoû", income: 61200, expenses: 34100, profit: 27100, goal: 27000 },
  { month: "Sep", income: 66800, expenses: 35400, profit: 31400, goal: 30000 },
  { month: "Oct", income: 71500, expenses: 37200, profit: 34300, goal: 32000 },
  { month: "Nov", income: 76200, expenses: 38900, profit: 37300, goal: 35000 },
  { month: "Déc", income: 82400, expenses: 41200, profit: 41200, goal: 38000 },
];

export const quarterSummary = [
  { quarter: "Q1 2026", income: 139000, expenses: 83400, profit: 55600, margin: 40.0 },
  { quarter: "Q2 2026", income: 161700, expenses: 90700, profit: 71000, margin: 43.9 },
  { quarter: "Q3 2026", income: 190400, expenses: 103300, profit: 87100, margin: 45.7 },
  { quarter: "Q4 2026", income: 230100, expenses: 117300, profit: 112800, margin: 49.0 },
];

export const annualSummary = [
  { year: 2022, income: 148000, expenses: 112000, profit: 36000 },
  { year: 2023, income: 246000, expenses: 172000, profit: 74000 },
  { year: 2024, income: 398000, expenses: 258000, profit: 140000 },
  { year: 2025, income: 596000, expenses: 371000, profit: 225000 },
  { year: 2026, income: 721200, expenses: 394700, profit: 326500 },
];

export const taxesSummary = [
  { period: "Q1 2026", taxCollected: 19420, taxPaid: 11180, net: 8240, status: "Déclaré" },
  { period: "Q2 2026", taxCollected: 22610, taxPaid: 12240, net: 10370, status: "Déclaré" },
  { period: "Q3 2026", taxCollected: 26200, taxPaid: 13860, net: 12340, status: "En cours" },
  { period: "Q4 2026", taxCollected: 0, taxPaid: 0, net: 0, status: "À venir" },
];

/* ------------------------------------------------------------------ */
/* INVENTORY / PRICING                                                 */
/* ------------------------------------------------------------------ */

export type InventoryStatus = "IN STOCK" | "REORDER SOON" | "TIME TO REORDER" | "OUT OF STOCK";

export type Material = {
  ref: string;
  material: string;
  price: number;
  units: number;
  unit: string;
  unitPrice: number;
  inventory: number;
  lastChange: string;
  minInventory: number;
  status: InventoryStatus;
  value: number;
  notes: string;
};

const mkMaterial = (
  ref: string, material: string, price: number, units: number, unit: string,
  inventory: number, lastChange: string, minInventory: number, notes = "",
): Material => {
  const unitPrice = +(price / units).toFixed(4);
  const status: InventoryStatus =
    inventory <= 0 ? "OUT OF STOCK"
    : inventory < minInventory ? "TIME TO REORDER"
    : inventory < minInventory * 1.5 ? "REORDER SOON"
    : "IN STOCK";
  return { ref, material, price, units, unit, unitPrice, inventory, lastChange, minInventory, status, value: +(inventory * unitPrice).toFixed(2), notes };
};

export const materials: Material[] = [
  mkMaterial("MAT-SOJ-01", "Soja bio décortiqué", 340, 50000, "g", 42000, "2026-07-19", 20000, "Coop. Agricole Kongo"),
  mkMaterial("MAT-MAI-01", "Maïs jaune bio", 180, 50000, "g", 61000, "2026-07-15", 25000),
  mkMaterial("MAT-MIL-01", "Millet perlé", 210, 40000, "g", 18500, "2026-07-11", 15000),
  mkMaterial("MAT-ARA-01", "Arachides grillées", 260, 30000, "g", 9400, "2026-07-09", 12000, "Prix en hausse +8%"),
  mkMaterial("MAT-MOR-01", "Feuilles de Moringa séchées", 612, 120000, "g", 8200, "2026-07-17", 15000, "Délai fournisseur 12 j"),
  mkMaterial("MAT-BAO-01", "Pulpe de Baobab brute", 780, 200000, "g", 0, "2026-07-18", 30000, "Rupture — commande urgente"),
  mkMaterial("MAT-HIB-01", "Fleurs d'hibiscus", 145, 25000, "g", 31000, "2026-07-22", 10000),
  mkMaterial("MAT-GIN-01", "Gingembre séché", 190, 20000, "g", 12400, "2026-07-14", 8000),
  mkMaterial("MAT-WHE-01", "Protéine de pois", 940, 25000, "g", 16800, "2026-07-12", 10000),
  mkMaterial("MAT-SAC-01", "Sachet kraft doypack 500g", 1180, 5000, "unit", 3120, "2026-07-21", 1500, "Emballages Modernes"),
  mkMaterial("MAT-SAC-02", "Sachet kraft doypack 1kg", 1420, 4000, "unit", 1180, "2026-07-21", 1200),
  mkMaterial("MAT-ETQ-01", "Étiquettes adhésives", 320, 10000, "unit", 6400, "2026-07-05", 2500),
  mkMaterial("MAT-CAR-01", "Cartons d'expédition", 480, 800, "box", 260, "2026-07-16", 200),
  mkMaterial("MAT-DOS-01", "Doseur 30g", 210, 5000, "unit", 4100, "2026-07-08", 1500),
];

export type PriceCalcRow = {
  product: string;
  materialCost: number;
  laborCost: number;
  overhead: number;
  packaging: number;
  totalCost: number;
  marginPct: number;
  wholesale: number;
  retail: number;
  retailWithTax: number;
};

const mkPrice = (product: string, materialCost: number, laborCost: number, overhead: number, packaging: number, marginPct: number): PriceCalcRow => {
  const totalCost = +(materialCost + laborCost + overhead + packaging).toFixed(2);
  const wholesale = +(totalCost / (1 - marginPct / 100)).toFixed(2);
  const retail = +(wholesale * 1.45).toFixed(2);
  return { product, materialCost, laborCost, overhead, packaging, totalCost, marginPct, wholesale, retail, retailWithTax: +(retail * 1.16).toFixed(2) };
};

export const priceCalculator: PriceCalcRow[] = [
  mkPrice("Super Grow 500g", 2.35, 0.65, 0.55, 0.65, 55),
  mkPrice("Super Grow 1kg", 4.5, 0.9, 0.8, 0.85, 58),
  mkPrice("Mass Gainer 1kg", 7.2, 1.2, 1.0, 0.85, 62),
  mkPrice("Mass Gainer 2kg", 13.4, 1.8, 1.4, 1.1, 64),
  mkPrice("Protéine Végétale 500g", 5.3, 0.9, 0.8, 0.65, 60),
  mkPrice("Bouillie Nutritionnelle 800g", 3.1, 0.75, 0.6, 0.7, 56),
  mkPrice("Moringa Bio 250g", 2.2, 0.5, 0.45, 0.55, 62),
  mkPrice("Baobab en Poudre 500g", 2.7, 0.55, 0.5, 0.6, 63),
  mkPrice("Tisane Hibiscus 100g", 0.85, 0.35, 0.3, 0.4, 66),
  mkPrice("Gingembre Séché 200g", 1.2, 0.4, 0.35, 0.45, 60),
];

export type PriceListRow = {
  sku: string;
  product: string;
  category: string;
  unitCost: number;
  wholesale: number;
  retail: number;
  marginPct: number;
  channel: string;
};

export const priceList: PriceListRow[] = [
  { sku: "TSA-SG-500", product: "Super Grow 500g", category: "Bouillie", unitCost: 4.2, wholesale: 8.4, retail: 12.0, marginPct: 65.0, channel: "Détail + Gros" },
  { sku: "TSA-SG-1K", product: "Super Grow 1kg", category: "Bouillie", unitCost: 7.8, wholesale: 15.4, retail: 22.0, marginPct: 64.5, channel: "Détail + Gros" },
  { sku: "TSA-MG-1K", product: "Mass Gainer 1kg", category: "Protéines", unitCost: 11.5, wholesale: 23.8, retail: 34.0, marginPct: 66.2, channel: "Détail" },
  { sku: "TSA-MG-2K", product: "Mass Gainer 2kg", category: "Protéines", unitCost: 21.0, wholesale: 43.4, retail: 62.0, marginPct: 66.1, channel: "Détail" },
  { sku: "TSA-PR-500", product: "Protéine Végétale 500g", category: "Protéines", unitCost: 8.6, wholesale: 18.2, retail: 26.0, marginPct: 66.9, channel: "Détail + En ligne" },
  { sku: "TSA-BN-800", product: "Bouillie Nutritionnelle 800g", category: "Bouillie", unitCost: 5.4, wholesale: 10.5, retail: 15.0, marginPct: 64.0, channel: "Gros + Export" },
  { sku: "TSA-MO-250", product: "Moringa Bio 250g", category: "Superaliment", unitCost: 3.9, wholesale: 9.8, retail: 14.0, marginPct: 72.1, channel: "En ligne" },
  { sku: "TSA-BB-500", product: "Baobab en Poudre 500g", category: "Superaliment", unitCost: 4.6, wholesale: 12.6, retail: 18.0, marginPct: 74.4, channel: "En ligne + Export" },
  { sku: "TSA-HB-100", product: "Tisane Hibiscus 100g", category: "Infusion", unitCost: 1.8, wholesale: 5.25, retail: 7.5, marginPct: 76.0, channel: "Détail" },
  { sku: "TSA-GG-200", product: "Gingembre Séché 200g", category: "Superaliment", unitCost: 2.3, wholesale: 6.3, retail: 9.0, marginPct: 74.4, channel: "Détail + Gros" },
];

/* ------------------------------------------------------------------ */
/* ORDER TRACKER                                                       */
/* ------------------------------------------------------------------ */

export type OrderStatus = "En attente" | "En préparation" | "Expédiée" | "Livrée" | "Annulée";
export type OrderPriority = "Basse" | "Normale" | "Haute" | "Urgente";

export type Order = {
  n: number;
  date: string;
  sku: string;
  customer: string;
  product: string;
  qty: number;
  status: OrderStatus;
  priority: OrderPriority;
  amount: number;
  discount: number;
  total: number;
  delivery: string;
  tracking: string;
  dueDate: string;
  shipDate: string;
  arrivalDate: string;
  notes: string;
};

const mkOrder = (
  n: number, date: string, sku: string, customer: string, product: string, qty: number,
  unit: number, discount: number, status: OrderStatus, priority: OrderPriority,
  delivery: string, tracking: string, dueDate: string, shipDate: string, arrivalDate: string, notes = "",
): Order => {
  const amount = +(qty * unit).toFixed(2);
  return { n, date, sku, customer, product, qty, status, priority, amount, discount, total: +(amount - discount).toFixed(2), delivery, tracking, dueDate, shipDate, arrivalDate, notes };
};

export const orders: Order[] = [
  mkOrder(1, "2026-07-14", "TSA-SG-1K", "Pharmacie Kinshasa Centre", "Super Grow 1kg", 24, 22, 0, "Livrée", "Normale", "Coursier moto", "TSA-TRK-10241", "2026-07-17", "2026-07-15", "2026-07-16"),
  mkOrder(2, "2026-07-15", "TSA-MG-2K", "Boutique Bio Gombe", "Mass Gainer 2kg", 6, 62, 12, "Livrée", "Basse", "Retrait boutique", "—", "2026-07-18", "2026-07-16", "2026-07-16"),
  mkOrder(3, "2026-07-16", "TSA-BN-800", "Distributeur Brazzaville", "Bouillie Nutritionnelle 800g", 80, 15, 90, "Expédiée", "Haute", "Fret fluvial", "TSA-TRK-10247", "2026-07-25", "2026-07-19", "—", "Export — douane Beach Ngobila"),
  mkOrder(4, "2026-07-17", "TSA-MO-250", "Vente en ligne", "Moringa Bio 250g", 12, 14, 0, "Livrée", "Normale", "Livraison domicile", "TSA-TRK-10249", "2026-07-20", "2026-07-18", "2026-07-19"),
  mkOrder(5, "2026-07-18", "TSA-SG-500", "Supermarché Shoprite", "Super Grow 500g", 48, 12, 24, "Livrée", "Haute", "Camion 3.5t", "TSA-TRK-10252", "2026-07-21", "2026-07-19", "2026-07-20"),
  mkOrder(6, "2026-07-19", "TSA-PR-500", "Coach Fitness Lubumbashi", "Protéine Végétale 500g", 20, 26, 0, "Expédiée", "Normale", "Transport aérien", "TSA-TRK-10255", "2026-07-24", "2026-07-21", "—"),
  mkOrder(7, "2026-07-20", "TSA-HB-100", "Hôtel Fleuve Congo", "Tisane Hibiscus 100g", 150, 7.5, 75, "En préparation", "Urgente", "Camion 3.5t", "—", "2026-07-26", "—", "—", "Livraison avant réception VIP"),
  mkOrder(8, "2026-07-21", "TSA-BB-500", "Boutique Bio Gombe", "Baobab en Poudre 500g", 18, 18, 0, "En attente", "Haute", "Coursier moto", "—", "2026-07-27", "—", "—", "Stock insuffisant — production requise"),
  mkOrder(9, "2026-07-21", "TSA-MG-1K", "Salle de sport Elite Kin", "Mass Gainer 1kg", 30, 34, 60, "En préparation", "Normale", "Coursier moto", "—", "2026-07-28", "—", "—"),
  mkOrder(10, "2026-07-22", "TSA-GG-200", "Marché Central Matadi", "Gingembre Séché 200g", 60, 9, 30, "En attente", "Basse", "Camion 3.5t", "—", "2026-07-30", "—", "—"),
  mkOrder(11, "2026-07-22", "TSA-SG-1K", "Clinique Mère & Enfant", "Super Grow 1kg", 40, 22, 80, "En préparation", "Urgente", "Livraison domicile", "—", "2026-07-25", "—", "—", "Programme nutrition infantile"),
  mkOrder(12, "2026-07-22", "TSA-BN-800", "ONG Nutrition Kasaï", "Bouillie Nutritionnelle 800g", 200, 15, 300, "En attente", "Haute", "Fret routier", "—", "2026-08-05", "—", "—", "Appel d'offres — acompte 40%"),
];

export const orderStatusSummary = [
  { status: "Livrée", count: 4, amount: 2452 },
  { status: "Expédiée", count: 2, amount: 1630 },
  { status: "En préparation", count: 3, amount: 3005 },
  { status: "En attente", count: 3, amount: 3834 },
  { status: "Annulée", count: 0, amount: 0 },
];

export const orderPrioritySummary = [
  { priority: "Urgente", count: 2 },
  { priority: "Haute", count: 4 },
  { priority: "Normale", count: 4 },
  { priority: "Basse", count: 2 },
];

export const deliveryMethods = [
  "Coursier moto",
  "Livraison domicile",
  "Retrait boutique",
  "Camion 3.5t",
  "Fret fluvial",
  "Fret routier",
  "Transport aérien",
];
