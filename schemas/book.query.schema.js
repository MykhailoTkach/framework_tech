const bookQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    author: { type: "string", minLength: 1 },
  },
};

export default bookQuerySchema;
// s
export const bookQueryV2Schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    author: { type: "string", minLength: 1 },
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
};
