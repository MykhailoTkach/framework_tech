import { createAuthService } from "../services/auth.service.js";
import { randomUUID } from "node:crypto";

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
  const auth = createAuthService({ db: fastify.drizzle });

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
            accessToken: { type: "string" },
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

      const jti = randomUUID();

      const accessToken = await reply.jwtSign(
        { sub: user.id, email: user.email, jti },
        { expiresIn: "15m" },
      );

      const refreshToken = await reply.jwtSign(
        { sub: user.id },
        { expiresIn: "7d" },
      );

      await fastify.redis.set(`refresh:${user.id}`, refreshToken, "EX", 604800);

      reply
        .setCookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: fastify.config.NODE_ENV === "production",
          sameSite: "strict",
          path: "/auth/refresh",
        })
        .status(200)
        .send({ accessToken });
    },
  });

  fastify.post("/refresh", {
    schema: { tags: ["Auth"] },
    handler: async (request, reply) => {
      const refreshToken = request.cookies?.refreshToken;
      if (!refreshToken) {
        return reply.status(401).send({ error: "No refresh token" });
      }

      let payload;
      try {
        payload = fastify.jwt.verify(refreshToken);
      } catch {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }

      const stored = await fastify.redis.get(`refresh:${payload.sub}`);
      if (!stored || stored !== refreshToken) {
        return reply.status(401).send({ error: "Refresh token revoked" });
      }

      const jti = randomUUID();
      const accessToken = await reply.jwtSign(
        { sub: payload.sub, jti },
        { expiresIn: "15m" },
      );

      return reply.send({ accessToken });
    },
  });

  fastify.post("/logout", {
    schema: {
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
    },
    onRequest: [
      async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
    ],
    handler: async (request, reply) => {
      const { jti, exp, sub } = request.user;
      const currentTime = Math.floor(Date.now() / 1000);
      if (jti && exp > currentTime) {
        const ttl = exp - currentTime;
        await fastify.redis.set(`blacklist:${jti}`, "1", "EX", ttl);
      }
      await fastify.redis.del(`refresh:${sub}`);
      return reply.status(204).send();
    },
  });
}
