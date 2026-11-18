import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/appError';

/**
 * 檢查 Google Drive 功能是否啟用的中介軟體
 */
export function requireGoogleDriveEnabled(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 透過環境變數控制開關，未明確設為 'true' 時一律暫停服務
  if (process.env.ENABLE_GOOGLE_DRIVE !== 'true') {
    return next(
      new AppError('Google Drive 相關功能目前暫時關閉維護中', 503)
    );
  }

  next();
}
