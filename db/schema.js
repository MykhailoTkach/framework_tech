import { mysqlTable, int, varchar } from "drizzle-orm/mysql-core";

export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  year: int("year").notNull(),
  genre: varchar("genre", { length: 255 }).default(""),
  image: varchar("image", { length: 255 }),
  pagecount: int("pagecount").default(0),
});

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});
