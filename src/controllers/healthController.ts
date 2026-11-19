import type { Request, Response } from 'express';
import { checkHealthService } from '../services/healthService';
import { catchAsync } from '../utils/catchAsync';

/**
 * 取得系統健康檢查狀態
 */
export const getHealthStatus = catchAsync(
  async (_req: Request, res: Response) => {
    const report = await checkHealthService();
    const statusCode = report.status === 'ok' ? 200 : 503;

    res.status(statusCode).json(report);
  }
);
