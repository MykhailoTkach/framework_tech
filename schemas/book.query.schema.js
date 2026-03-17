const bookQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    author: { type: "string", minLength: 1 },
  },
};

export default bookQuerySchema;
