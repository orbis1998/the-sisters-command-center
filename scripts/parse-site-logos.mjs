import fs from "fs";

const html = fs.readFileSync("agent-tools/site.html", "utf8");
for (const term of ["logo.png", "logo-CX5ggQPR", "The Sisters"]) {
  let idx = 0;
  let count = 0;
  while ((idx = html.indexOf(term, idx)) !== -1 && count < 5) {
    console.log(`\n=== ${term} #${count + 1} ===`);
    console.log(html.slice(Math.max(0, idx - 120), idx + term.length + 120));
    idx += term.length;
    count += 1;
  }
}
