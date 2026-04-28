import { Router } from 'express';
import {
  registerUser,
  loginUser,
  sayHello
} from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @openapi
 * /users/register:
 *   post:
 *     summary: 註冊新用戶
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [account, password, email, birthday, phone]
 *             properties:
 *               account: { type: string, example: "test123" }
 *               password: { type: string, example: "Password123" }
 *               email: { type: string, example: "test@gmail.com" }
 *               birthday: { type: string, example: "1995-01-01" }
 *               phone: { type: string, example: "0912345678" }
 *     responses:
 *       200:
 *         description: 註冊成功
 *       400:
 *         description: 格式錯誤或帳號已存在
 */
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/hello', sayHello);
router.get('/me', authenticateToken, (req, res) => {
  /* ...原本 /me 的邏輯 ... */
});

export default router;
