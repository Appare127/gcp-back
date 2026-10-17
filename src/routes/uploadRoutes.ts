import { Router } from 'express';
import {
  uploadSingleImage,
  uploadAndAnalyzeGeoLiteCsv,
  checkIpGeoLite,
  checkIpFirehol,
  uploadAndAnalyzeFireholCsv,
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
 * /upload/geolite/check:
 *   get:
 *     summary: 查詢單一 IP 的 GeoLite2 (ISP / ASN 與地理位置) 資訊
 *     tags: [GeoLite2]
 *     parameters:
 *       - in: query
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *         description: 欲查詢的 IPv4 或 IPv6 位址 (例如 1.1.1.1 或 2606:4700:4700::1111)
 *     responses:
 *       200:
 *         $ref: '#/components/responses/GeoLiteSingleIpCheckSuccess'
 *       400:
 *         description: 未提供 IP 參數或格式錯誤
 */
router.get('/geolite/check', checkIpGeoLite);

/**
 * @openapi
 * /upload/geolite/csv:
 *   post:
 *     summary: 上傳並即時分析 IP CSV 檔案 (GeoLite2 分析)
 *     tags: [GeoLite2]
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
 *         $ref: '#/components/responses/GeoLiteAnalysisSuccess'
 *       400:
 *         description: 未選擇檔案或檔案格式錯誤
 */
router.post('/geolite/csv', uploadCsv.single('file'), uploadAndAnalyzeGeoLiteCsv);

/**
 * @openapi
 * /upload/firehol/check:
 *   get:
 *     summary: 查詢單一 IP 是否在線上 FireHOL Level 1 惡意黑名單中
 *     tags: [FireHOL]
 *     parameters:
 *       - in: query
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *         description: 欲查詢的 IPv4 位址 (例如 1.10.16.5)
 *     responses:
 *       200:
 *         description: 查詢成功，回傳是否命中黑名單與詳細狀態
 *       400:
 *         description: 未提供 IP 參數或格式錯誤
 */
router.get('/firehol/check', checkIpFirehol);

/**
 * @openapi
 * /upload/firehol/csv:
 *   post:
 *     summary: 上傳 IP CSV 檔案並進行線上 FireHOL Level 1 批次黑名單分析
 *     tags: [FireHOL]
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
 *                 description: 請選擇要上傳並比對 FireHOL 的 .csv 檔案
 *     responses:
 *       200:
 *         $ref: '#/components/responses/FireholAnalysisSuccess'
 *       400:
 *         description: 未選擇檔案或檔案格式錯誤
 */
router.post('/firehol/csv', uploadCsv.single('file'), uploadAndAnalyzeFireholCsv);

router.get('/files', getDriveFiles);

router.post('/folder', createFolder);
router.delete('/files/:id', deleteFile);

export default router;

