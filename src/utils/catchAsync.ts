import { Request, Response, NextFunction } from 'express';

/**
 * 這是一個高階函式，它接收一個非同步函式 (fn)
 * 並回傳一個標準的 Express Middleware
 * 它會自動捕捉 fn 執行過程中的錯誤，並傳給 next()
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next); // 關鍵點：捕捉錯誤並交給 next()
  };
};
