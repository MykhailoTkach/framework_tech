import { createAuthService } from "../services/auth.service.js";

const registerSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
    },
  },
};

const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
    },
  },
};

export default async function authRoutes(fastify) {
  const auth = createAuthService({
    db: fastify.drizzle,
    redis: fastify.redis,
  });

  fastify.post("/register", {
    schema: {
      tags: ["Auth"],
      body: registerSchema.body,
      response: {
        201: {
          type: "object",
          properties: {
            id: { type: "integer" },
            email: { type: "string" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body;
      try {
        const user = await auth.register({ email, password });
        return reply.status(201).send(user);
      } catch (err) {
        if (err.cause?.code === "ER_DUP_ENTRY") {
          return reply.status(409).send({ error: "Email already exists" });
        }
        throw err;
      }
    },
  });

  fastify.post("/login", {
    schema: {
      tags: ["Auth"],
      body: loginSchema.body,
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body;
      const user = await auth.login({ email, password });
      if (!user) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }
      request.session.userId = user.id;
      return reply.send({ success: true });
    },
  });

  fastify.post("/logout", {
    schema: { tags: ["Auth"] },
    handler: async (request, reply) => {
      await request.session.destroy();
      return reply.status(204).send();
    },
  });
}
