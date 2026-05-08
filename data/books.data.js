export function createBookRepository(db) {
  const Book = db.model("Book");

  return {
    async getAll() {
      const docs = await Book.find({}).lean();
      return docs.map(toBook);
    },

    async findById(id) {
      try {
        const doc = await Book.findById(id).lean();
        return toBook(doc);
      } catch {
        return null;
      }
    },

    async create(data) {
      const doc = await Book.create(data);
      return toBook(doc.toObject());
    },

    async update(id, data) {
      try {
        const doc = await Book.findByIdAndUpdate(
          id,
          { $set: data },
          { new: true },
        ).lean();
        return toBook(doc);
      } catch {
        return null;
      }
    },

    async replace(id, data) {
      try {
        const doc = await Book.findByIdAndUpdate(
          id,
          { $set: data },
          { new: true },
        ).lean();
        return toBook(doc);
      } catch {
        return null;
      }
    },

    async remove(id) {
      try {
        const doc = await Book.findByIdAndDelete(id).lean();
        return toBook(doc);
      } catch {
        return null;
      }
    },
  };
}

function toBook(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}
