import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getUserInfo,
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
 *       $ref: '#/components/requestBodies/RegisterUserInput'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/CreatedUser'
 */
router.post('/register', registerUser);

/**
 * @openapi
 * /users/login:
 *   post:
 *     summary: 登入
 *     tags: [Users]
 *     requestBody:
 *       $ref: '#/components/requestBodies/LoginUserInput'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/LoginSuccess'
 *       401:
 *         description: 帳號或密碼錯誤
 */
router.post('/login', loginUser);

/**
 * @openapi
 * /users/info:
 *   get:
 *     summary: 取得當前登入用戶資料
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功取得用戶資料
 *       401:
 *         description: 未授權或 Token 無效
 */
router.get('/info', authenticateToken, getUserInfo);

router.get('/hello', sayHello);
router.get('/me', authenticateToken, (req, res) => {
  /* ...原本 /me 的邏輯 ... */
});

export default router;
