import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * 驗證 JWT 的中介軟體
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 從 Headers 裡面拿通行證 (通常放在 Authorization 這個 Header 裡)
  // 格式通常是: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: '找不到通行證，請先登入' });
    return;
  }

  try {
    // 驗證通行證是否正確 (這裡要用跟登入時一樣的金鑰)
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    // 如果驗證成功，我們把解析出來的使用者資訊塞進 req 裡面，讓後面的 Controller 可以用
    (req as any).user = decoded;

    // 安檢通過！呼叫 next() 讓請求繼續前往下一個站點 (Controller)
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: '通行證無效或已過期' });
  }
}
