import mongoose from "mongoose";
import { Book } from "../../db/models/book.model.js";
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
  await mongoose.connect(process.env.MONGO_URL, {
    dbName: process.env.MONGO_DB_NAME,
  });

  const count = await Book.countDocuments();

  if (!force && count > 0) {
    console.log("DB is not empty. Use seed:force to reset.");
    await mongoose.connection.close();
    return;
  }

  if (force) await Book.deleteMany({});

  await Book.insertMany(INITIAL_BOOKS);
  console.log("Seed complete.");
  await mongoose.connection.close();
}

const force = process.argv.includes("--force");
seed(force).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
