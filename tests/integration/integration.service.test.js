import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../app.js";
import { users, books } from "../../db/schema.js";

describe("Auth API Integration", () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.drizzle.delete(users);
    await app.drizzle.delete(books);
    await app.redis.flushdb();
  });

  describe("POST /auth/register", () => {
    it("should register a user and return 201", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "test@test.com", password: "123456" },
      });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveProperty("id");
      expect(response.json()).toHaveProperty("email", "test@test.com");
      expect(response.json()).not.toHaveProperty("password");
    });

    it("should return 409 if email already exists", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "test@test.com", password: "123456" },
      });
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "test@test.com", password: "123456" },
      });
      expect(response.statusCode).toBe(409);
    });

    it("should return 400 if email is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "notanemail", password: "123456" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 if password is too short", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "test@test.com", password: "123" },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "test@test.com", password: "123456" },
      });
    });

    it("should return 200 and accessToken", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@test.com", password: "123456" },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("accessToken");
    });

    it("should return 401 if password is wrong", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@test.com", password: "wrongpass" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 401 if user does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "nouser@test.com", password: "123456" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should store refresh token in Redis", async () => {
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@test.com", password: "123456" },
      });
      const { accessToken } = loginResponse.json();
      const payload = app.jwt.decode(accessToken);
      const stored = await app.redis.get(`refresh:${payload.sub}`);
      expect(stored).not.toBeNull();
    });
  });

  describe("POST /auth/logout", () => {
    let accessToken;

    beforeEach(async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "test@test.com", password: "123456" },
      });
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@test.com", password: "123456" },
      });
      accessToken = loginResponse.json().accessToken;
    });

    it("should return 204 on logout", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(response.statusCode).toBe(204);
    });

    it("should add token to blacklist in Redis", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = app.jwt.decode(accessToken);
      const blacklisted = await app.redis.get(`blacklist:${payload.jti}`);
      expect(blacklisted).toBe("1");
    });

    it("should return 401 without token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
      });
      expect(response.statusCode).toBe(401);
    });
  });
  describe("POST /auth/refresh", () => {
    beforeEach(async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "refresh@test.com", password: "123456" },
      });
    });

    it("should return 401 if no refresh token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toHaveProperty("error", "No refresh token");
    });

    it("should return 401 if refresh token is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: { refreshToken: "invalid.token.here" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return new accessToken with valid refresh token", async () => {
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "refresh@test.com", password: "123456" },
      });
      const cookies = loginResponse.cookies;
      const refreshToken = cookies.find(
        (c) => c.name === "refreshToken",
      )?.value;

      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: { refreshToken },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("accessToken");
    });
  });
  describe("POST /auth/refresh", () => {
    beforeEach(async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "refresh@test.com", password: "123456" },
      });
    });

    it("should return 401 if no refresh token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toHaveProperty("error", "No refresh token");
    });

    it("should return 401 if refresh token is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: { refreshToken: "invalid.token.here" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return new accessToken with valid refresh token", async () => {
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "refresh@test.com", password: "123456" },
      });
      const cookies = loginResponse.cookies;
      const refreshToken = cookies.find(
        (c) => c.name === "refreshToken",
      )?.value;

      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: { refreshToken },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("accessToken");
    });
  });
});
