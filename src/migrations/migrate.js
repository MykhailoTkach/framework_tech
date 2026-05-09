import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_FILE = path.join(__dirname, "../../db/schema.sql");

export function computeSchemaHash(schema) {
  return crypto.createHash("md5").update(schema).digest("hex");
}

export async function checkMigration(fastify) {
  try {
    const schema = await fs.readFile(SCHEMA_FILE, "utf8");
    const currentHash = computeSchemaHash(schema);

    const [rows] = await fastify.mysql.execute(
      "SELECT hash FROM migrations ORDER BY id DESC LIMIT 1",
    );

    const savedHash = rows[0]?.hash ?? null;

    if (currentHash !== savedHash) {
      fastify.log.warn('Data schema changed. Run "npm run migrate" to update.');
    }
  } catch (err) {
    fastify.log.error(`Migration check failed: ${err.message}`);
  }
}

if (process.argv[1] === __filename) {
  const pool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
  });

  const schema = await fs.readFile(SCHEMA_FILE, "utf8");
  const currentHash = computeSchemaHash(schema);

  await pool.execute("INSERT INTO migrations (hash) VALUES (?)", [currentHash]);

  console.log("Migration hash saved.");
  await pool.end();
}
