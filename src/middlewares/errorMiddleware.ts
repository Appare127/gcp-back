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
  err.statusCode = err.statusCode || 500;

  // 1. 在開發環境，我們印出詳細錯誤方便 Debug
  console.error('💥 Error:', err);

  // 2. 回傳統一的 JSON 格式
  res.status(err.statusCode).json({
    success: false,
    message: err.message || '伺服器內部錯誤',
    // 只有在開發時才回傳 stack (堆疊追蹤)，幫助找錯
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
