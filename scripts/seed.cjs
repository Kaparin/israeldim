const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Run via tsx to support TypeScript imports
const tsxPath = path.join(__dirname, "..", "node_modules", ".bin", "tsx");
const seedTsPath = path.join(__dirname, "seed-run.ts");

execSync(`npx tsx ${seedTsPath}`, {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
  env: { ...process.env },
});
