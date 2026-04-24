// 三大區塊：1
// Routes (路由層)
// 主要職責：網路請求的守門員與總機。
// 負責做什麼：
// 定義應用程式的 API 進入點 (Endpoint)，例如 GET /api/users 或 POST /api/login。
// 決定哪個 URL 路徑和 HTTP 動作 (GET/POST/PUT/DELETE) 應該交給哪個具體的 Controller 來處理。
// (通常) 會在這裡配置相關的 Middleware，例如：身分驗證 (Auth)、請求參數的格式校驗 (Validation)。

// 不該做什麼：絕對不應該在這裡寫任何「讀寫資料庫」或「判斷商業邏輯」的程式碼。

import { Router } from 'express';
import {
  sayHello,
  registerUser,
  loginUser
} from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { createArticle } from '../controllers/articleController';

const router = Router();

// 定義 GET /api/hello 網址，並指派給 sayHello 這個 Controller 處理
router.get('/hello', sayHello);
router.post('/register', registerUser);
router.post('/login', loginUser);

// 使用 POST 方法來「建立 (Create)」一支「文章 (Article)」
router.post('/articles', authenticateToken, createArticle);

// 需要通行證：查看個人資料 (在路徑與 Controller 中間插入 authenticateToken)
router.get('/me', authenticateToken, (req, res) => {
  // 因為 authenticateToken 通過了，我們可以直接拿到剛剛塞進去的 user 資訊
  const user = (req as any).user;
  res.status(200).json({
    success: true,
    message: '這是您的隱私資料',
    user: user
  });
});

export default router;
