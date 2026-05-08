import { Transform } from "stream";

export class BookAgeTransform extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(book, encoding, callback) {
    const age = new Date().getFullYear() - book.year;
    callback(null, { ...book, age });
  }
}
