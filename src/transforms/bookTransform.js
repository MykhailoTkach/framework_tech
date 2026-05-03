import { Transform } from "stream";

// Варіант 3 — додає поле age: кількість років з моменту видання
export class BookAgeTransform extends Transform {
  constructor() {
    super({ objectMode: true }); // працюємо з обєктами а не буферами
  }

  _transform(book, encoding, callback) {
    const age = new Date().getFullYear() - book.year;
    callback(null, { ...book, age });
  }
}
