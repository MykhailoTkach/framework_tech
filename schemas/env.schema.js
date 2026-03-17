const envSchema = {
  type: "object",
  required: ["PORT", "HOSTNAME", "NODE_ENV"],
  properties: {
    PORT: {
      type: "string",
      pattern:
        "^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$",
    },
    HOSTNAME: {
      type: "string",
      minLength: 1,
    },
    NODE_ENV: {
      type: "string",
      enum: ["development", "production"],
    },
  },
};

export default envSchema;
