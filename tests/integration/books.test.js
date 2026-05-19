import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../app.js";
import { books } from "../../db/schema.js";

describe("Books API Integration", () => {
  let app;
  let accessToken;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "books@test.com", password: "123456" },
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "books@test.com", password: "123456" },
    });
    accessToken = loginResponse.json().accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.drizzle.delete(books);
    await app.redis.flushdb();
  });

  describe("GET /api/v1/books", () => {
    it("should return 200 and empty list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/books",
      });
      expect(response.statusCode).toBe(200);
    });

    it("should be public — no token needed", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/books",
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("POST /api/v1/books", () => {
    it("should return 401 without token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        payload: {
          title: "Test",
          author: "Author",
          year: 2024,
          genre: "Fiction",
          pagecount: 100,
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should create a book and return 201", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test Book",
          author: "Test Author",
          year: 2024,
          genre: "Fiction",
          pagecount: 100,
        },
      });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveProperty("id");
      expect(response.json()).toHaveProperty("title", "Test Book");
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { title: "Test Book" },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/books/:id", () => {
    it("should return 200 and book by id", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test Book",
          author: "Test Author",
          year: 2024,
          genre: "Fiction",
          pagecount: 100,
        },
      });
      const { id } = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/books/${id}`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("id", id);
    });

    it("should return 404 if book not found", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/books/99999",
      });
      expect(response.statusCode).toBe(404);
    });
  });

  it("should update a book and return 200", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/books",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: "Test Book",
        author: "Test Author",
        year: 2024,
        genre: "Fiction",
        pagecount: 100,
      },
    });
    const { id } = createResponse.json();

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/books/${id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: "Updated Title" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty("title", "Updated Title");
  });

  describe("DELETE /api/v1/books/:id", () => {
    it("should return 401 without token", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/books/1",
      });
      expect(response.statusCode).toBe(401);
    });

    it("should delete a book and return 200", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test Book",
          author: "Test Author",
          year: 2024,
          genre: "Fiction",
          pagecount: 100,
        },
      });
      const { id } = createResponse.json();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/books/${id}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("message");
    });
  });

  describe("GET /api/v2/books", () => {
    it("should return 200 with pagination", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v2/books?page=1&limit=10",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("data");
      expect(response.json()).toHaveProperty("meta");
    });

    it("should cache response in Redis", async () => {
      await app.inject({
        method: "GET",
        url: "/api/v2/books?page=1&limit=10",
      });
      const keys = await app.redis.keys("books:page:*");
      expect(keys.length).toBeGreaterThan(0);
    });

    it("should invalidate cache after POST", async () => {
      await app.inject({
        method: "GET",
        url: "/api/v2/books?page=1&limit=10",
      });

      await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "New Book",
          author: "Author",
          year: 2024,
          genre: "Fiction",
          pagecount: 100,
        },
      });

      const keys = await app.redis.keys("books:page:*");
      expect(keys.length).toBe(0);
    });
  });
});
