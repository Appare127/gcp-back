import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

import express from 'express';
import cors from 'cors';
import routes from './routes';
import { globalErrorHandler } from './middlewares/errorMiddleware';

const app = express();

// 基本的中介軟體
app.use(cors()); // 允許前端跨域連線
app.use(express.json()); // 支援解析 JSON 格式的 Request Body

// 掛載 API 路由，所有的路由都會加上 /api 前綴
app.use('/api', routes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 掛載全域錯誤處理中間件（放在所有路由後面）
app.use(globalErrorHandler);

export default app;
