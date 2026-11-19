import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * 從請求的 Cookie Header 解析指定名稱的 Cookie 值
 */
function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const prefix = `${name}=`;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return undefined;
}

/**
 * 驗證 JWT 的中介軟體（優先讀取 HttpOnly Cookie，並相容 Bearer Token）
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 優先從 HttpOnly Cookie 讀取 token，若無則退回檢查 Authorization: Bearer <token>
  const cookieToken = getCookieValue(req.headers.cookie, 'token');
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const token = cookieToken || bearerToken;

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
