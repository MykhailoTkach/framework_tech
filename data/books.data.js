"use strict";

const books = [{ id: 1, title: "Kobzar", author: "Shevchenko", year: 1840 }];
let nextId = 2;

function getAll() {
  return books;
}
function getNextId() {
  return nextId++;
}
function push(book) {
  books.push(book);
}
function findById(id) {
  return books.find((b) => b.id === id);
}
function findIndexById(id) {
  return books.findIndex((b) => b.id === id);
}
function replaceAt(index, book) {
  books[index] = book;
}
function removeAt(index) {
  return books.splice(index, 1)[0];
}

module.exports = {
  getAll,
  getNextId,
  push,
  findById,
  findIndexById,
  replaceAt,
  removeAt,
};
