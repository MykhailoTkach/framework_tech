import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAuthService } from "../../services/auth.service.js";

describe("AuthService", () => {
  let mockDb;
  let service;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    service = createAuthService({ db: mockDb });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a user and return id and email", async () => {
      mockDb.values.mockResolvedValueOnce([{ insertId: 1 }]);
      const result = await service.register({
        email: "test@test.com",
        password: "123456",
      });
      expect(result).toEqual({ id: 1, email: "test@test.com" });
      expect(result).not.toHaveProperty("password");
    });

    it("should hash the password before saving", async () => {
      mockDb.values.mockResolvedValueOnce([{ insertId: 2 }]);
      await service.register({ email: "test@test.com", password: "123456" });
      const calledWith = mockDb.values.mock.calls[0][0];
      expect(calledWith.password).not.toBe("123456");
      expect(calledWith.password).toMatch(/^\$argon2/);
    });
  });

  describe("login", () => {
    it("should return null if user not found", async () => {
      mockDb.where.mockResolvedValueOnce([]);
      const result = await service.login({
        email: "nouser@test.com",
        password: "123456",
      });
      expect(result).toBeNull();
    });

    it("should return null if password is wrong", async () => {
      const argon2 = await import("argon2");
      const hash = await argon2.hash("correctpassword");
      mockDb.where.mockResolvedValueOnce([
        { id: 1, email: "test@test.com", password: hash },
      ]);
      const result = await service.login({
        email: "test@test.com",
        password: "wrongpassword",
      });
      expect(result).toBeNull();
    });

    it("should return user without password if credentials are correct", async () => {
      const argon2 = await import("argon2");
      const hash = await argon2.hash("123456");
      mockDb.where.mockResolvedValueOnce([
        { id: 1, email: "test@test.com", password: hash },
      ]);
      const result = await service.login({
        email: "test@test.com",
        password: "123456",
      });
      expect(result).toEqual({ id: 1, email: "test@test.com" });
      expect(result).not.toHaveProperty("password");
    });
  });
});
