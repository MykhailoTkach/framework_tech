import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
});

const sql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
const statements = sql.split(";").filter((s) => s.trim());

for (const statement of statements) {
  await pool.execute(statement);
}

console.log("Schema initialized.");
await pool.end();

