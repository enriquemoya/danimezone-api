const fs = require("fs");
const path = require("path");

const srcRoot = path.join(__dirname, "..", "src", "email-templates");
const distRoot = path.join(__dirname, "..", "dist", "email-templates");

const templatesJs = path.join(srcRoot, "templates.js");
const templatesDts = path.join(srcRoot, "templates.d.ts");

fs.mkdirSync(distRoot, { recursive: true });

if (fs.existsSync(templatesJs)) {
  fs.copyFileSync(templatesJs, path.join(distRoot, "templates.js"));
}

if (fs.existsSync(templatesDts)) {
  fs.copyFileSync(templatesDts, path.join(distRoot, "templates.d.ts"));
}

console.log("[copy-email-templates] done");
