import { eq } from "drizzle-orm";
import { books } from "../db/schema.js";

export function createBookRepository(db) {
  return {
    async getAll() {
      return db.select().from(books);
    },

    async findById(id) {
      const rows = await db.select().from(books).where(eq(books.id, id));
      return rows[0] ?? null;
    },

    async create(data) {
      const result = await db.insert(books).values({
        title: data.title,
        author: data.author,
        year: data.year,
        genre: data.genre ?? "",
        image: data.image ?? null,
        pagecount: data.pagecount ?? 0,
      });
      const rows = await db
        .select()
        .from(books)
        .where(eq(books.id, result[0].insertId));
      return rows[0];
    },

    async update(id, data) {
      const existing = await this.findById(id);
      if (!existing) return null;
      await db.update(books).set(data).where(eq(books.id, id));
      return this.findById(id);
    },

    async replace(id, data) {
      const existing = await this.findById(id);
      if (!existing) return null;
      await db
        .update(books)
        .set({
          title: data.title,
          author: data.author,
          year: data.year,
          genre: data.genre ?? "",
          image: data.image ?? null,
          pagecount: data.pagecount ?? 0,
        })
        .where(eq(books.id, id));
      return this.findById(id);
    },

    async remove(id) {
      const existing = await this.findById(id);
      if (!existing) return null;
      await db.delete(books).where(eq(books.id, id));
      return existing;
    },
  };
}
