import { Router } from 'express';
import { getResumeContactInfo } from '../controllers/resumeController';

const router = Router();

/**
 * @openapi
 * /resume/contact-info:
 *   get:
 *     summary: 取得履歷聯絡資訊
 *     tags: [Resume]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/ResumeContactInfoSuccess'
 *       404:
 *         description: 找不到履歷聯絡資訊
 */
router.get('/contact-info', getResumeContactInfo);

export default router;
