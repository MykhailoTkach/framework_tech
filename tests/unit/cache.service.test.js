import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCacheService } from "../../services/cache.service.js";

describe("CacheService", () => {
  let mockRedis;
  let service;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
    };
    service = createCacheService({ redis: mockRedis });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("get", () => {
    it("should return parsed value if key exists", async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ id: 1 }));
      const result = await service.get("test:key");
      expect(result).toEqual({ id: 1 });
    });

    it("should return null if key does not exist", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await service.get("test:key");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("should set value with default TTL 120", async () => {
      await service.set("test:key", { id: 1 });
      expect(mockRedis.set).toHaveBeenCalledWith(
        "test:key",
        JSON.stringify({ id: 1 }),
        "EX",
        120,
      );
    });

    it("should set value with custom TTL", async () => {
      await service.set("test:key", { id: 1 }, 86400);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "test:key",
        JSON.stringify({ id: 1 }),
        "EX",
        86400,
      );
    });
  });

  describe("del", () => {
    it("should delete a key", async () => {
      await service.del("test:key");
      expect(mockRedis.del).toHaveBeenCalledWith("test:key");
    });
  });

  describe("delByPattern", () => {
    it("should delete all keys matching pattern", async () => {
      mockRedis.keys.mockResolvedValueOnce(["books:page:1", "books:page:2"]);
      await service.delByPattern("books:page:*");
      expect(mockRedis.del).toHaveBeenCalledWith(
        "books:page:1",
        "books:page:2",
      );
    });

    it("should not call del if no keys found", async () => {
      mockRedis.keys.mockResolvedValueOnce([]);
      await service.delByPattern("books:page:*");
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
