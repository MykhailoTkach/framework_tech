import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { books } from "../../db/schema.js";
import "dotenv/config";

const INITIAL_BOOKS = [
  { title: "Kobzar", author: "Shevchenko", year: 1840, genre: "Poetry" },
  { title: "Tini zabutykh predkiv", author: "Kotsiubynsky", year: 1911, genre: "Novel" },
  { title: "Lisova pisnia", author: "Lesia Ukrainka", year: 1911, genre: "Drama" },];

async function seed(force = false) {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
  });

  const db = drizzle(pool, { mode: "default" });

  const existing = await db.select().from(books);

  if (!force && existing.length > 0) {
    console.log("DB is not empty. Use seed:force to reset.");
    await pool.end();
    return;
  }

  if (force) await db.delete(books);

  await db.insert(books).values(INITIAL_BOOKS);
  console.log("Seed complete.");
  await pool.end();
}

const force = process.argv.includes("--force");
seed(force).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});


