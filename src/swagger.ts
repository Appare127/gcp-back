import swaggerJsdoc from 'swagger-jsdoc';
import { allSchemas, allResponses, allRequestBodies } from './docs/schemas';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GCP 後端專案 API 文件',
      version: '1.0.0',
      description: '這是使用 Express + Prisma + TypeScript 打造的標準後端架構'
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '本地開發伺服器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: allSchemas,
      responses: allResponses,
      requestBodies: allRequestBodies
    }
  },
  // 指定要掃描哪些檔案裡面的註解來產生文件
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
