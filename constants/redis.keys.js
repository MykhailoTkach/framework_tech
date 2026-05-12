export const REDIS_KEYS = {
  genreCache: (genre) => `genre:${genre}`,
  booksPage: (page, limit) => `books:page:${page}:limit:${limit}`,
  booksAll: () => "books:all",
};
