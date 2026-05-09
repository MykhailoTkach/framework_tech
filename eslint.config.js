import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message: "Use fastify.config instead of process.env directly.",
        },
      ],
    },
  },
  {
    files: [
      "config/node-env.js",
      "controllers/github.controller.js",
      "db/init.js",
      "src/scripts/seed.js",
      "src/migrations/migrate.js",
      "drizzle.config.js",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
