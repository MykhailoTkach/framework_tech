import {
  getSharedReposV1,
  getSharedReposV2,
} from "../controllers/github.controller.js";

export default async function githubRoutes(fastify) {
  fastify.get("/github/shared-repos", {
    schema: {
      querystring: {
        type: "object",
        required: ["repo"],
        properties: { repo: { type: "string" } },
      },
    },
    handler: getSharedReposV1,
  });
}

export async function githubV2Routes(fastify) {
  fastify.get("/github/shared-repos", {
    schema: {
      querystring: {
        type: "object",
        required: ["repo"],
        properties: { repo: { type: "string" } },
      },
    },
    handler: getSharedReposV2,
  });
}
