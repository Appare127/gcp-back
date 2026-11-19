import { Router } from 'express';
import { getHealthStatus } from '../controllers/healthController';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: 系統健康檢查（掛載於根路徑 /health，不經過 /api 限流）
 *     tags: [Health]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/HealthCheckOk'
 *       503:
 *         $ref: '#/components/responses/HealthCheckError'
 */
router.get('/', getHealthStatus);

export default router;
