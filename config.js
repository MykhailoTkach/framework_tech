"use strict";

const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
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

const errors = [];

const rawPort = process.env.PORT;
if (!rawPort) {
  errors.push("PORT is required but not set.");
} else {
  const parsedPort = Number(rawPort);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    errors.push(
      `PORT must be an integer between 1 and 65535. Got: "${rawPort}".`,
    );
  }
}

const rawHostname = process.env.HOSTNAME;
if (!rawHostname || rawHostname.trim() === "") {
  errors.push("HOSTNAME is required but not set.");
}

const ALLOWED_ENVS = ["development", "production"];
const rawNodeEnv = process.env.NODE_ENV;
if (!rawNodeEnv) {
  errors.push("NODE_ENV is required but not set.");
} else if (!ALLOWED_ENVS.includes(rawNodeEnv)) {
  errors.push(
    `NODE_ENV must be one of: ${ALLOWED_ENVS.join(" | ")}. Got: "${rawNodeEnv}".`,
  );
}

if (errors.length > 0) {
  console.error("=== Configuration errors ===");
  errors.forEach((e) => console.error(`  ✗ ${e}`));
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

