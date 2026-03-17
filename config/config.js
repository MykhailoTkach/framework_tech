"use strict";

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const { envSchema } = require("#schemas");

function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const ajv = new Ajv({ allErrors: true }); // allErrors — збирає всі помилки одразу

const validate = ajv.compile(envSchema);

const valid = validate({
  PORT: process.env.PORT,
  HOSTNAME: process.env.HOSTNAME,
  NODE_ENV: process.env.NODE_ENV,
});

if (!valid) {
  console.error("=== Configuration errors ===");
  validate.errors.forEach((e) => {
    console.error(`  ✗ ${e.instancePath || e.schemaPath} — ${e.message}`);
  });
  console.error("Server cannot start. Fix .env and restart.");
  process.exit(1);
}

module.exports = {
  PORT: Number(process.env.PORT),
  HOSTNAME: process.env.HOSTNAME.trim(),
  NODE_ENV: process.env.NODE_ENV,
  IS_DEV: process.env.NODE_ENV === "development",
  IS_PROD: process.env.NODE_ENV === "production",
};
