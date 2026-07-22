// Realistic mock data for The Sisters Business OS
export type Role = "CEO" | "Accountant";

export const company = {
  name: "The Sisters Africa",
  tagline: "Compléments alimentaires Bio",
  currency: "USD",
  fiscalYear: 2026,
};

export const products = [
  { sku: "TSA-SG-500", name: "Super Grow 500g", category: "Bouillie", cost: 4.2, price: 12.0, stock: 842, reorder: 200, dept: "Nutrition Enfant" },
  { sku: "TSA-SG-1K", name: "Super Grow 1kg", category: "Bouillie", cost: 7.8, price: 22.0, stock: 421, reorder: 150, dept: "Nutrition Enfant" },
  { sku: "TSA-MG-1K", name: "Mass Gainer 1kg", category: "Protéines", cost: 11.5, price: 34.0, stock: 268, reorder: 100, dept: "Sport & Fitness" },
  { sku: "TSA-MG-2K", name: "Mass Gainer 2kg", category: "Protéines", cost: 21.0, price: 62.0, stock: 134, reorder: 60, dept: "Sport & Fitness" },
  { sku: "TSA-PR-500", name: "Protéine Végétale 500g", category: "Protéines", cost: 8.6, price: 26.0, stock: 356, reorder: 120, dept: "Sport & Fitness" },
  { sku: "TSA-BN-800", name: "Bouillie Nutritionnelle 800g", category: "Bouillie", cost: 5.4, price: 15.0, stock: 612, reorder: 180, dept: "Nutrition Enfant" },
  { sku: "TSA-MO-250", name: "Moringa Bio 250g", category: "Superaliment", cost: 3.9, price: 14.0, stock: 78, reorder: 100, dept: "Bien-être" },
  { sku: "TSA-BB-500", name: "Baobab en Poudre 500g", category: "Superaliment", cost: 4.6, price: 18.0, stock: 45, reorder: 80, dept: "Bien-être" },
  { sku: "TSA-HB-100", name: "Tisane Hibiscus 100g", category: "Infusion", cost: 1.8, price: 7.5, stock: 920, reorder: 250, dept: "Bien-être" },
  { sku: "TSA-GG-200", name: "Gingembre Séché 200g", category: "Superaliment", cost: 2.3, price: 9.0, stock: 512, reorder: 150, dept: "Bien-être" },
];

export const departments = [
  { name: "Nutrition Enfant", revenue: 84200, growth: 18.2, share: 38 },
  { name: "Sport & Fitness", revenue: 62800, growth: 24.6, share: 28 },
  { name: "Bien-être", revenue: 41600, growth: 9.4, share: 19 },
  { name: "Infusions", revenue: 18300, growth: -3.1, share: 8 },
  { name: "Export RDC/Congo", revenue: 16200, growth: 41.3, share: 7 },
];

export const monthlyFinancials = [
  { month: "Jan", revenue: 42000, expenses: 26400, profit: 15600, budget: 40000 },
  { month: "Fév", revenue: 45800, expenses: 27100, profit: 18700, budget: 42000 },
  { month: "Mar", revenue: 51200, expenses: 29900, profit: 21300, budget: 46000 },
  { month: "Avr", revenue: 48600, expenses: 28800, profit: 19800, budget: 48000 },
  { month: "Mai", revenue: 54200, expenses: 30200, profit: 24000, budget: 50000 },
  { month: "Juin", revenue: 58900, expenses: 31700, profit: 27200, budget: 52000 },
  { month: "Juil", revenue: 62400, expenses: 33800, profit: 28600, budget: 55000 },
  { month: "Aoû", revenue: 61200, expenses: 34100, profit: 27100, budget: 57000 },
  { month: "Sep", revenue: 66800, expenses: 35400, profit: 31400, budget: 60000 },
  { month: "Oct", revenue: 71500, expenses: 37200, profit: 34300, budget: 63000 },
  { month: "Nov", revenue: 76200, expenses: 38900, profit: 37300, budget: 66000 },
  { month: "Déc", revenue: 82400, expenses: 41200, profit: 41200, budget: 70000 },
];

export const expenseBreakdown = [
  { category: "Achats matières premières", amount: 148200, share: 34 },
  { category: "Salaires & charges", amount: 96400, share: 22 },
  { category: "Logistique & expédition", amount: 62100, share: 14 },
  { category: "Marketing & publicité", amount: 48900, share: 11 },
  { category: "Loyer & utilités", amount: 32600, share: 7 },
  { category: "Emballage", amount: 28400, share: 6 },
  { category: "Divers", amount: 24300, share: 6 },
];

export const revenues = [
  { id: "REV-2026-0142", date: "2026-07-20", client: "Pharmacie Kinshasa Centre", product: "Super Grow 1kg", qty: 24, unit: 22, total: 528, method: "Virement", status: "Payé" },
  { id: "REV-2026-0143", date: "2026-07-20", client: "Boutique Bio Gombe", product: "Mass Gainer 2kg", qty: 6, unit: 62, total: 372, method: "Mobile Money", status: "Payé" },
  { id: "REV-2026-0144", date: "2026-07-21", client: "Distributeur Brazzaville", product: "Bouillie Nut. 800g", qty: 80, unit: 15, total: 1200, method: "Virement", status: "En attente" },
  { id: "REV-2026-0145", date: "2026-07-21", client: "Vente en ligne", product: "Moringa Bio 250g", qty: 12, unit: 14, total: 168, method: "Carte", status: "Payé" },
  { id: "REV-2026-0146", date: "2026-07-22", client: "Supermarché Shoprite", product: "Super Grow 500g", qty: 48, unit: 12, total: 576, method: "Virement", status: "Payé" },
  { id: "REV-2026-0147", date: "2026-07-22", client: "Coach Fitness Lubumbashi", product: "Protéine Végétale 500g", qty: 20, unit: 26, total: 520, method: "Mobile Money", status: "Payé" },
];

export const expenses = [
  { id: "EXP-2026-0088", date: "2026-07-19", vendor: "Coop. Agricole Kongo", category: "Matières premières", desc: "Soja bio 500kg", amount: 3400, method: "Virement", status: "Payé" },
  { id: "EXP-2026-0089", date: "2026-07-20", vendor: "TransCongo Logistics", category: "Logistique", desc: "Expédition Brazzaville", amount: 620, method: "Espèces", status: "Payé" },
  { id: "EXP-2026-0090", date: "2026-07-21", vendor: "Emballages Modernes", category: "Emballage", desc: "Sachets kraft 5000u", amount: 1180, method: "Virement", status: "En attente" },
  { id: "EXP-2026-0091", date: "2026-07-21", vendor: "Meta Ads", category: "Marketing", desc: "Campagne Juillet", amount: 900, method: "Carte", status: "Payé" },
  { id: "EXP-2026-0092", date: "2026-07-22", vendor: "SNEL", category: "Utilités", desc: "Électricité usine", amount: 480, method: "Virement", status: "Payé" },
];

export const stockMovements = [
  { id: "MV-2026-0311", date: "2026-07-20", sku: "TSA-SG-1K", type: "Entrée", qty: 200, reason: "Production Lot #2026-142", user: "Grâce M." },
  { id: "MV-2026-0312", date: "2026-07-20", sku: "TSA-MG-2K", type: "Sortie", qty: -6, reason: "Vente REV-0143", user: "Sarah K." },
  { id: "MV-2026-0313", date: "2026-07-21", sku: "TSA-MO-250", type: "Ajustement", qty: -4, reason: "Casse inventaire", user: "CEO" },
  { id: "MV-2026-0314", date: "2026-07-21", sku: "TSA-BN-800", type: "Sortie", qty: -80, reason: "Vente Brazzaville", user: "Sarah K." },
  { id: "MV-2026-0315", date: "2026-07-22", sku: "TSA-HB-100", type: "Entrée", qty: 500, reason: "Production Lot #2026-143", user: "Grâce M." },
];

export const activityLog = [
  { time: "il y a 4 min", user: "Sarah K.", role: "Accountant", action: "a enregistré la vente", target: "REV-2026-0147 · $520" },
  { time: "il y a 12 min", user: "Grâce M.", role: "Accountant", action: "a mis à jour le stock", target: "TSA-HB-100 · +500u" },
  { time: "il y a 34 min", user: "CEO", role: "CEO", action: "a ajusté le prix d'achat", target: "TSA-SG-1K · $7.20 → $7.80" },
  { time: "il y a 1 h", user: "Sarah K.", role: "Accountant", action: "a téléversé un justificatif", target: "EXP-2026-0091.pdf" },
  { time: "il y a 2 h", user: "CEO", role: "CEO", action: "a validé le budget Q3", target: "Budget 2026-Q3" },
  { time: "il y a 3 h", user: "Grâce M.", role: "Accountant", action: "a créé une entrée stock", target: "MV-2026-0311" },
  { time: "il y a 5 h", user: "CEO", role: "CEO", action: "a exporté le rapport mensuel", target: "Rapport-Juin-2026.xlsx" },
];

export const alerts = [
  { id: 1, level: "critical", title: "Rupture imminente — Baobab 500g", detail: "45 unités restantes · seuil 80. Réappro. sous 7 jours.", time: "il y a 15 min" },
  { id: 2, level: "warning", title: "Marge en baisse — Mass Gainer 1kg", detail: "Marge 66% → 62% ce mois. Coût matière +8%.", time: "il y a 1 h" },
  { id: 3, level: "warning", title: "Facture en attente > 5 jours", detail: "Distributeur Brazzaville · $1,200 · REV-2026-0144", time: "il y a 3 h" },
  { id: 4, level: "info", title: "Budget marketing atteint à 82%", detail: "$48,900 / $60,000 pour l'exercice 2026.", time: "il y a 6 h" },
  { id: 5, level: "success", title: "Objectif mensuel dépassé", detail: "Revenus Juillet à 118% de l'objectif ($62,400).", time: "il y a 1 j" },
];

export const documents = [
  { name: "Facture-REV-2026-0142.pdf", type: "Facture", size: "142 KB", date: "2026-07-20", owner: "Sarah K." },
  { name: "Bon-livraison-Brazza-0311.pdf", type: "Bon de livraison", size: "88 KB", date: "2026-07-20", owner: "Grâce M." },
  { name: "Reçu-Meta-Ads-Juillet.pdf", type: "Reçu", size: "64 KB", date: "2026-07-21", owner: "Sarah K." },
  { name: "Contrat-Coop-Agricole-Kongo.pdf", type: "Contrat", size: "412 KB", date: "2026-06-14", owner: "CEO" },
  { name: "Rapport-Juin-2026.xlsx", type: "Rapport", size: "1.2 MB", date: "2026-07-02", owner: "CEO" },
  { name: "Inventaire-Q2-2026.xlsx", type: "Inventaire", size: "864 KB", date: "2026-07-01", owner: "Grâce M." },
];

export const users = [
  { name: "The Sisters (CEO)", email: "ceo@thesistersafrica.com", role: "CEO", status: "Actif", last: "Maintenant" },
  { name: "Sarah Kabongo", email: "sarah@thesistersafrica.com", role: "Accountant", status: "Actif", last: "il y a 4 min" },
  { name: "Grâce Mbuyi", email: "grace@thesistersafrica.com", role: "Accountant", status: "Actif", last: "il y a 12 min" },
  { name: "Jean-Paul Mvumbi", email: "jp@thesistersafrica.com", role: "Accountant", status: "Invité", last: "—" },
];

export const insights = [
  {
    title: "Levier de croissance",
    body: "Le segment Sport & Fitness croît de +24.6% MoM. Recommandation : allouer +$3,500 au marketing digital ciblé RDC urbaine.",
    tag: "Opportunité",
  },
  {
    title: "Risque approvisionnement",
    body: "Moringa et Baobab sous seuil critique. Anticiper commande fournisseur — délai moyen 12 jours en saison pluies.",
    tag: "Risque",
  },
  {
    title: "Rentabilité produit",
    body: "Mass Gainer 2kg génère 34% de la marge brute avec 8% du volume. Prioriser la production Lot #2026-144.",
    tag: "Insight",
  },
  {
    title: "Prévision Q4",
    body: "Sur trajectoire actuelle, revenus 2026 projetés à $781K (+31% vs 2025). Marge nette prévisionnelle : 34.2%.",
    tag: "Forecast",
  },
];

export const treasury = {
  cash: 84620,
  bank: 142380,
  mobileMoney: 18940,
  receivables: 31200,
  payables: 22800,
};

export const kpis = {
  revenueMTD: 62400,
  revenueGrowth: 12.4,
  netProfitMTD: 28600,
  marginPct: 45.8,
  inventoryValue: 47820,
  cashOnHand: 245940,
  ordersMTD: 218,
  avgOrderValue: 286,
};
