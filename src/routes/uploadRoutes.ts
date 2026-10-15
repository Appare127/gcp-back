import { Router } from 'express';
import {
  uploadSingleImage,
  uploadAndAnalyzeCsv,
  getDriveFiles,
  createFolder,
  deleteFile
} from '@/controllers/uploadController';
import { uploadImage, uploadCsv } from '@/middlewares/uploadMiddleware';

const router = Router();

// 'image' 必須跟前端傳來的欄位名稱 (Key) 一致
router.post('/single', uploadImage.single('image'), uploadSingleImage);

/**
 * @openapi
 * /upload/csv:
 *   post:
 *     summary: 上傳並即時分析 IP CSV 檔案
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 請選擇要上傳並分析的 .csv 檔案
 *     responses:
 *       200:
 *         description: 分析完成，回傳產業類別分佈與 Top 30 IP 統計報表
 *       400:
 *         description: 未選擇檔案或檔案格式錯誤
 */
router.post('/csv', uploadCsv.single('file'), uploadAndAnalyzeCsv);

router.get('/files', getDriveFiles);

router.post('/folder', createFolder);
router.delete('/files/:id', deleteFile);

export default router;
