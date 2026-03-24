const START_TIME = Date.now();

export default async function healthRoutes(fastify) {
  fastify.get("/health", {
    schema: {
      response: {
        200: { type: "object", properties: { status: { type: "string" } } },
      },
    },
    handler: async () => ({ status: "ok" }),
  });

  fastify.get("/health/details", {
    onRequest: async (request, reply) => {
      const key = request.headers["x-api-key"];
      if (!key || key !== fastify.config.ADMIN_API_KEY) {
        throw reply.unauthorized("Invalid or missing x-api-key header.");
      }
    },
    handler: async () => {
      const mem = process.memoryUsage();
      return {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: `${((Date.now() - START_TIME) / 1000).toFixed(2)}s`,
        memoryUsage: {
          rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        },
      };
    },
  });
}
