import path from "path";
import { fileURLToPath } from "url";
import { writeAtomic } from "../../utils/atomicWrite.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data/items");

const INITIAL_BOOKS = [
  {
    id: 1,
    title: "Kobzar",
    author: "Shevchenko",
    year: 1840,
    genre: "Poetry",
    image: null,
  },
  {
    id: 2,
    title: "Tini zabutykh predkiv",
    author: "Kotsiubynsky",
    year: 1911,
    genre: "Novel",
    image: null,
  },
  {
    id: 3,
    title: "Lisova pisnia",
    author: "Lesia Ukrainka",
    year: 1911,
    genre: "Drama",
    image: null,
  },
];

async function seed() {
  console.log("Seeding data...");
  for (const book of INITIAL_BOOKS) {
    await writeAtomic(path.join(DATA_DIR, `${book.id}.json`), book);
    console.log(`  ✓ data/items/${book.id}.json`);
  }
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
