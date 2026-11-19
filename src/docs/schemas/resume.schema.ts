export const resumeSchemas = {
  ResumeContactInfo: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        example: '0928-xxxxxx'
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'apparexxxxxx@gmail.com'
      }
    }
  }
};

export const resumeResponses = {
  ResumeContactInfoSuccess: {
    description: '成功取得履歷聯絡資訊',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ResumeContactInfo' }
          }
        }
      }
    }
  }
};
