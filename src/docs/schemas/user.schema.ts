export const userSchemas = {
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      account: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  }
};
