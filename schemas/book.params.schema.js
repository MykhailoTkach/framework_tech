const bookParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 1 }, // змінили з integer на string
  },
};

export default bookParamsSchema;
