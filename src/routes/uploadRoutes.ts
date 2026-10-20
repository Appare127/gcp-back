import { Router } from 'express';
import {
  uploadSingleImage,
  checkIpGeoLite,
  checkIpFirehol,
  checkIpAbuseDb,
  checkIpSecurityIntel,
  uploadAndAnalyzeSecurityIntelCsv,
  testAiAgent,
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
 * /upload/firehol/check:
 *   get:
 *     summary: 查詢單一 IP 是否在線上 FireHOL (Level 1 & Level 2) 或 Spamhaus 黑名單中
 *     tags: [FireHOL]
 *     parameters:
 *       - in: query
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *         description: 欲查詢的 IPv4 或 IPv6 位址 (例如 1.10.16.5 或 2001:db8::1)
 *     responses:
 *       200:
 *         $ref: '#/components/responses/FireholSingleIpCheckSuccess'
 *       400:
 *         description: 未提供 IP 參數或格式錯誤
 */
router.get('/firehol/check', checkIpFirehol);

/**
 * @openapi
 * /upload/abuseipdb/check:
 *   get:
 *     summary: 單獨查詢單一 IP 的 AbuseIPDB 社群惡意檢舉情報 (Redis 24 小時快取)
 *     tags: [AbuseIPDB]
 *     parameters:
 *       - in: query
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *         description: 欲查詢的 IPv4 或 IPv6 位址 (例如 118.25.6.39 或 2001:db8::1)
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AbuseIpDbSingleIpCheckSuccess'
 *       400:
 *         description: 未提供 IP 參數或格式錯誤
 */
router.get('/abuseipdb/check', checkIpAbuseDb);


/**
 * @openapi
 * /upload/security-intel/check:
 *   get:
 *     summary: 查詢單一 IP 全方位威脅情報 (GeoLite2 + FireHOL L1/L2 + AbuseIPDB + Gemini AI)
 *     tags: [SecurityIntel]
 *     parameters:
 *       - in: query
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *         description: 欲查詢的 IPv4 或 IPv6 位址 (例如 118.25.6.39 或 2001:db8::1)
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SecurityIntelSingleIpCheckSuccess'
 *       400:
 *         description: 未提供 IP 參數或格式錯誤
 */
router.get('/security-intel/check', checkIpSecurityIntel);

/**
 * @openapi
 * /upload/security-intel/csv:
 *   post:
 *     summary: 上傳 IP CSV 檔案進行全方位威脅情報綜合分析 (GeoLite2 + FireHOL L1/L2 + AbuseIPDB 聚合詳細清單)
 *     tags: [SecurityIntel]
 *     parameters:
 *       - in: query
 *         name: includeDetail
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否回傳詳細 IP 清單 (包含每筆 IP 的 GeoLite2、FireHOL、AbuseIPDB 狀態)
 *       - in: query
 *         name: abuseLimit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *         description: AbuseIPDB 外部 API 查詢上限 (已快取於 Redis 者不計入此上限)
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
 *                 description: 請選擇要上傳並進行綜合安全分析的 .csv 檔案
 *               includeDetail:
 *                 type: boolean
 *                 default: false
 *                 description: 是否回傳詳細 IP 清單
 *               abuseLimit:
 *                 type: integer
 *                 default: 50
 *                 description: AbuseIPDB 外部 API 查詢上限
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SecurityIntelAnalysisSuccess'
 *       400:
 *         description: 未選擇檔案或檔案格式錯誤
 */
router.post(
  '/security-intel/csv',
  uploadCsv.single('file'),
  uploadAndAnalyzeSecurityIntelCsv
);

/**
 * @openapi
 * /upload/ai-agent/test:
 *   get:
 *     summary: 測試與 Gemini AI Agent 通訊與連線 (GET 快速連線測試)
 *     tags: [AIAgent]
 *     parameters:
 *       - in: query
 *         name: prompt
 *         required: false
 *         schema:
 *           type: string
 *         description: 測試提示詞或欲諮詢的問題 (未提供時將發送預設資安自我介紹與最新威脅查詢)
 *       - in: query
 *         name: enableGoogleSearch
 *         required: false
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否啟用 Google Search 即時聯網搜尋工具
 *       - in: query
 *         name: model
 *         required: false
 *         schema:
 *           type: string
 *           default: gemini-3-flash-preview
 *         description: 指定 Gemini 模型名稱
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AiAgentTestSuccess'
 *       500:
 *         description: 未設定 GEMINI_API_KEY 或系統錯誤
 *       502:
 *         description: 與 AI Agent 通訊失敗
 *   post:
 *     summary: 測試與 Gemini AI Agent 通訊與對話 (POST 傳送自訂 Prompt 與系統指示)
 *     tags: [AIAgent]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AiAgentTestRequest'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AiAgentTestSuccess'
 *       500:
 *         description: 未設定 GEMINI_API_KEY 或系統錯誤
 *       502:
 *         description: 與 AI Agent 通訊失敗
 */
router.get('/ai-agent/test', testAiAgent);
router.post('/ai-agent/test', testAiAgent);

router.get('/files', getDriveFiles);

router.post('/folder', createFolder);
router.delete('/files/:id', deleteFile);

export default router;

