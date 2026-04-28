import { Router } from 'express';
import {
  createArticle,
  getAllArticles
} from '../controllers/articleController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @openapi
 * /articles:
 *   post:
 *     summary: 發布新文章 (需登入)
 *     tags: [Articles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       $ref: '#/components/requestBodies/CreateArticle'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/CreatedArticle'
 */
router.post('/', authenticateToken, createArticle); // 對應到 /api/articles
router.get('/', getAllArticles); // 對應到 /api/articles

export default router;
