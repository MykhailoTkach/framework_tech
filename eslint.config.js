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
    files: ["config/node-env.js"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
