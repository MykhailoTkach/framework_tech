import mysql from "mysql2/promise";
import "dotenv/config";

const INITIAL_BOOKS = [
  { title: "Kobzar", author: "Shevchenko", year: 1840, genre: "Poetry" },
  {
    title: "Tini zabutykh predkiv",
    author: "Kotsiubynsky",
    year: 1911,
    genre: "Novel",
  },
  {
    title: "Lisova pisnia",
    author: "Lesia Ukrainka",
    year: 1911,
    genre: "Drama",
  },
];

async function seed(force = false) {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
  });

  const [rows] = await pool.execute("SELECT COUNT(*) as count FROM books");
  const count = rows[0].count;

  if (!force && count > 0) {
    console.log("DB is not empty. Use seed:force to reset.");
    await pool.end();
    return;
  }

  if (force) await pool.execute("DELETE FROM books");

  for (const book of INITIAL_BOOKS) {
    await pool.execute(
      "INSERT INTO books (title, author, year, genre) VALUES (?, ?, ?, ?)",
      [book.title, book.author, book.year, book.genre],
    );
  }

  console.log("Seed complete.");
  await pool.end();
}

const force = process.argv.includes("--force");
seed(force).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});


