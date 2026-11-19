import type { Request, Response, NextFunction } from 'express';

/**
 * 全域錯誤處理終點站
 * Express 只要看到有 4 個參數的 Middleware，就會把它當作錯誤處理器
 */
export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const isOperational = Boolean(err.isOperational);

  // 1. 印出詳細錯誤方便伺服器端除錯
  console.error('💥 Error:', err);

  // 2. 正式環境下，非預期的系統錯誤（!isOperational）不暴露原生 err.message，防止洩漏內部細節
  const clientMessage =
    isProduction && !isOperational
      ? '伺服器內部錯誤，請稍後再試'
      : err.message || '伺服器內部錯誤';

  // 3. 回傳統一的 JSON 格式
  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    // 只有在開發時才回傳 stack (堆疊追蹤)，幫助找錯
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
