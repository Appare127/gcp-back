export const healthSchemas = {
  DependencyCheckResult: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['up', 'down'],
        example: 'up'
      },
      latencyMs: {
        type: 'integer',
        example: 4
      }
    }
  },
  HealthCheckReport: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      status: {
        type: 'string',
        enum: ['ok', 'error'],
        example: 'ok'
      },
      commit: { type: 'string', example: 'a1b2c3d' },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2026-11-19T09:15:27.000Z'
      },
      uptime: { type: 'integer', example: 3600 },
      checks: {
        type: 'object',
        properties: {
          database: { $ref: '#/components/schemas/DependencyCheckResult' },
          redis: { $ref: '#/components/schemas/DependencyCheckResult' }
        }
      }
    }
  }
};

export const healthResponses = {
  HealthCheckOk: {
    description: '系統與所有相依服務皆正常',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/HealthCheckReport'
        }
      }
    }
  },
  HealthCheckError: {
    description: '部分相依服務異常（資料庫或 Redis 無法連線）',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/HealthCheckReport'
        }
      }
    }
  }
};
