import { describe, it, expect } from "vitest";
import { buildImageUrl, withImageUrl } from "../../utils/imageUrl.js";

describe("imageUrl utils", () => {
  const mockRequest = {
    protocol: "http",
    host: "localhost:3000",
  };

  describe("buildImageUrl", () => {
    it("should return null if imagePath is null", () => {
      expect(buildImageUrl(mockRequest, null)).toBeNull();
    });

    it("should return null if imagePath is undefined", () => {
      expect(buildImageUrl(mockRequest, undefined)).toBeNull();
    });

    it("should return full url if imagePath is provided", () => {
      const result = buildImageUrl(mockRequest, "/test.jpg");
      expect(result).toBe("http://localhost:3000/uploads/test.jpg");
    });
  });

  describe("withImageUrl", () => {
    it("should return book with image url", () => {
      const book = { id: 1, title: "Test", image: "/test.jpg" };
      const result = withImageUrl(mockRequest, book);
      expect(result.image).toBe("http://localhost:3000/uploads/test.jpg");
    });

    it("should return book with null image if no image", () => {
      const book = { id: 1, title: "Test", image: null };
      const result = withImageUrl(mockRequest, book);
      expect(result.image).toBeNull();
    });
  });
});
