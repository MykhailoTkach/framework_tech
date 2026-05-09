const envSchema = {
  type: "object",
  required: ["PORT", "HOSTNAME", "NODE_ENV", "ADMIN_API_KEY"],
  properties: {
    PORT: { type: "integer", default: 3000 },
    HOSTNAME: { type: "string", default: "localhost" },
    NODE_ENV: {
      type: "string",
      enum: ["development", "production"],
      default: "development",
    },
    ADMIN_API_KEY: { type: "string", minLength: 1 },
    GITHUB_TOKEN: { type: "string", default: "" },
    MYSQL_HOST: { type: "string", default: "localhost" },
    MYSQL_PORT: { type: "integer", default: 3306 },
    MYSQL_USER: { type: "string" },
    MYSQL_PASSWORD: { type: "string" },
    MYSQL_DB: { type: "string" },
  },
};

export default envSchema;
