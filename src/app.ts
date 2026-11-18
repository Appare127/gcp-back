import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes';
import { globalErrorHandler } from './middlewares/errorMiddleware';
import { generalApiRateLimiter } from './middlewares/rateLimitMiddleware';
import { AppError } from './utils/appError';

const app = express();

// 信任反向代理層數（Cloudflare -> Nginx -> Express 共 2 層），確保 req.ip 取得真實訪客 IP
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 2);
app.set('trust proxy', trustProxyHops);

// CORS 白名單設定（正式環境僅允許正式網域，可透過 CORS_ORIGINS 環境變數以逗號分隔覆寫）
const defaultCorsOrigins =
  process.env.NODE_ENV === 'production'
    ? ['https://appare-kaysen.com', 'https://www.appare-kaysen.com']
    : [
        'https://appare-kaysen.com',
        'https://www.appare-kaysen.com',
        'http://localhost:5173',
        'http://localhost:3000'
      ];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : defaultCorsOrigins;

// 正式環境允許存取 /api-docs 的白名單 IP（多個 IP 以逗號分隔；未設定則完全關閉）
const swaggerAllowedIps = (process.env.SWAGGER_ALLOWED_IPS || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

/**
 * 限制正式環境僅允許白名單 IP 存取 Swagger API 文件
 */
function guardSwaggerAccess(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const clientIp = req.ip || '';
  // 相容 IPv4-mapped IPv6 格式（例如 ::ffff:1.2.3.4）
  const normalizedIp = clientIp.replace(/^::ffff:/, '');

  if (
    swaggerAllowedIps.length === 0 ||
    (!swaggerAllowedIps.includes(clientIp) &&
      !swaggerAllowedIps.includes(normalizedIp))
  ) {
    // 回傳 404 隱藏端點存在，避免暴露資訊給掃描器
    return res.status(404).json({
      success: false,
      message: '找不到此頁面'
    });
  }

  // 通過白名單驗證後，移除 CSP 限制以確保 Swagger UI 內嵌腳本能正常渲染
  res.removeHeader('Content-Security-Policy');
  next();
}

// 基本的中介軟體
// 設定安全 HTTP 標頭（開發環境關閉 CSP 以免阻擋 Swagger UI 內嵌腳本）
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production'
  })
);
app.use(
  cors({
    origin(origin, callback) {
      // 允許無 Origin 標頭（如同源請求或伺服器端呼叫）及白名單內的來源
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new AppError(`不允許的 CORS 來源: ${origin}`, 403));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' })); // 限制 JSON Payload 大小上限，防止大封包耗盡記憶體
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 當網址輸入 /uploads 時，去對應到專案目錄下的 public/uploads 資料夾
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// 掛載 API 路由與全域 Redis 限流，所有的路由都會加上 /api 前綴
app.use('/api', generalApiRateLimiter, routes);

app.use('/api-docs', guardSwaggerAccess, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 掛載全域錯誤處理中間件（放在所有路由後面）
app.use(globalErrorHandler);

export default app;
