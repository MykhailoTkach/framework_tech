export function createBookRepository(db) {
  return {
    async getAll() {
      const [rows] = await db.execute("SELECT * FROM books");
      return rows;
    },

    async findById(id) {
      const [rows] = await db.execute("SELECT * FROM books WHERE id = ?", [id]);
      return rows[0] ?? null;
    },

    async create(data) {
      const [result] = await db.execute(
        "INSERT INTO books (title, author, year, genre, image, pagecount) VALUES (?, ?, ?, ?, ?, ?)",
        [
          data.title,
          data.author,
          data.year,
          data.genre ?? "",
          data.image ?? null,
          data.pagecount ?? 0,
        ],
      );
      const [rows] = await db.execute("SELECT * FROM books WHERE id = ?", [
        result.insertId,
      ]);
      return rows[0];
    },

    async update(id, data) {
      const [existing] = await db.execute("SELECT * FROM books WHERE id = ?", [
        id,
      ]);
      if (!existing[0]) return null;
      const updated = { ...existing[0], ...data };
      await db.execute(
        "UPDATE books SET title=?, author=?, year=?, genre=?, image=?, pagecount=? WHERE id=?",
        [
          updated.title,
          updated.author,
          updated.year,
          updated.genre,
          updated.image,
          updated.pagecount ?? 0,
          id,
        ],
      );
      const [rows] = await db.execute("SELECT * FROM books WHERE id = ?", [id]);
      return rows[0];
    },

    async replace(id, data) {
      const [existing] = await db.execute("SELECT * FROM books WHERE id = ?", [
        id,
      ]);
      if (!existing[0]) return null;
      await db.execute(
        "UPDATE books SET title=?, author=?, year=?, genre=?, image=?, pagecount=? WHERE id=?",
        [
          data.title,
          data.author,
          data.year,
          data.genre ?? "",
          data.image ?? null,
          data.pagecount ?? 0,
          id,
        ],
      );
      const [rows] = await db.execute("SELECT * FROM books WHERE id = ?", [id]);
      return rows[0];
    },

    async remove(id) {
      const [existing] = await db.execute("SELECT * FROM books WHERE id = ?", [
        id,
      ]);
      if (!existing[0]) return null;
      await db.execute("DELETE FROM books WHERE id=?", [id]);
      return existing[0];
    },
  };
}


