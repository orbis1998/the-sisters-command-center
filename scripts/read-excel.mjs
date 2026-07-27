import XLSX from "xlsx";
import fs from "fs";

const files = [
  "Copie de Order Tracker.xlsx",
  "Copie de Pricing Calculator & Inventory Tracker.xlsx",
  "Copie de Ultimate Bookkeeping.xlsx",
];

for (const file of files) {
  console.log("\n==========", file, "==========");
  const wb = XLSX.readFile(file, { cellDates: true });
  console.log("SHEETS:", wb.SheetNames);
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    console.log(`\n--- SHEET: ${name} (${rows.length} rows) ---`);
    // print first 25 rows for structure
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      const cells = row.map((c) => (c === null || c === undefined ? "" : String(c).slice(0, 40)));
      if (cells.some((c) => c.trim() !== "")) {
        console.log(String(i).padStart(2, "0"), "|", cells.join(" || "));
      }
    }
  }
}
