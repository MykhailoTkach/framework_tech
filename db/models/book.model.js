import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: Number, required: true, min: 0 },
  genre: { type: String, default: "" },
  image: { type: String, default: null },
  pagecount: { type: Number, default: 0 },
});

export const Book = mongoose.model("Book", bookSchema);
