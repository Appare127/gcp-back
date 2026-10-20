import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '@/utils/catchAsync';
import { AppError } from '@/utils/appError';
import { uploadToGCS } from '@/gcs';
import {
  uploadToDrive,
  listDriveFiles,
  createDriveFolder,
  deleteDriveFile
} from '@/drive';
import {
  checkSingleIpGeoLite,
  checkSingleIpFirehol,
  checkSingleIpSecurityIntel,
  analyzeSecurityIntelCsv
} from '@/services/securityIntel';


/**
 * 查詢單一 IP 的 GeoLite2 (ISP / ASN 與地理位置) 資訊
 */
export const checkIpGeoLite = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.query.ip as string)?.trim();
    if (!ip) {
      return next(new AppError('請提供欲查詢的 IP 參數 (?ip=...)', 400));
    }

    const result = await checkSingleIpGeoLite(ip);

    res.status(200).json({
      success: true,
      message: 'GeoLite2 單一 IP 查詢成功！',
      data: result
    });
  }
);

/**
 * 查詢單一 IP 是否在線上 FireHOL Level 1 黑名單中
 */
export const checkIpFirehol = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.query.ip as string;
    if (!ip) {
      return next(new AppError('請提供欲查詢的 IP 參數 (?ip=...)', 400));
    }

    const result = await checkSingleIpFirehol(ip);

    res.status(200).json({
      success: true,
      data: result
    });
  }
);


/**
 * 查詢單一 IP 的全方位安全威脅情報 (GeoLite2 + FireHOL L1/L2 + AbuseIPDB + Gemini AI)
 */
export const checkIpSecurityIntel = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.query.ip as string)?.trim();
    if (!ip) {
      return next(new AppError('請提供欲查詢的 IP 參數 (?ip=...)', 400));
    }

    const result = await checkSingleIpSecurityIntel(ip);

    res.status(200).json({
      success: true,
      message: '全方位安全威脅情報查詢成功！',
      data: result
    });
  }
);

/**
 * 上傳 CSV 檔案進行全方位安全情報分析 (GeoLite2 + FireHOL L1/L2 + AbuseIPDB 聚合)
 */
export const uploadAndAnalyzeSecurityIntelCsv = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(new AppError('請選擇要上傳的 CSV 檔案', 400));
    }

    // 取得是否回傳詳細 IP 清單開關
    const includeDetail =
      req.query.includeDetail === 'true' ||
      req.body.includeDetail === 'true' ||
      req.body.includeDetail === true;

    // 取得 AbuseIPDB 外部 API 查詢上限 (預設 50)
    const rawLimit = req.query.abuseLimit || req.body.abuseLimit;
    const abuseCheckLimit = rawLimit ? parseInt(String(rawLimit), 10) || 50 : 50;

    const result = await analyzeSecurityIntelCsv(req.file.buffer, {
      includeDetail,
      abuseCheckLimit
    });

    res.status(200).json({
      success: true,
      message: '全方位安全威脅情報 CSV 分析完成！',
      data: result
    });
  }
);

export const uploadSingleImage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Multer 會把檔案資訊放在 req.file
    if (!req.file) {
      return next(new AppError('請選擇要上傳的圖片', 400));
    }

    // 1. 呼叫雲端上傳工具
    // const imageUrl = await uploadToGCS(req.file);
    const fileUrl = await uploadToDrive(req.file);

    res.status(200).json({
      success: true,
      message: '圖片上傳成功！',
      data: {
        url: fileUrl
      }
      // data: {
      //   filename: req.file.filename,
      //   path: req.file.path,
      //   size: req.file.size
      // }
    });
  }
);

export const getDriveFiles = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 也可以從 query 取得特定的 folderId，如果沒有就用預設的
    const folderId = (req.query.folderId as string) || undefined;

    const files = await listDriveFiles(folderId);

    res.status(200).json({
      success: true,
      results: files.length,
      data: files
    });
  }
);

// 建立資料夾
export const createFolder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, parentId } = req.body;
    if (!name) return next(new AppError('請提供資料夾名稱', 400));
    const folder = await createDriveFolder(name, parentId);
    res.status(201).json({
      success: true,
      data: folder
    });
  }
);

// 刪除檔案/資料夾
export const deleteFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (!id) return next(new AppError('請提供檔案 ID', 400));
    await deleteDriveFile(id as string);
    res.status(204).json({
      success: true,
      data: null
    });
  }
);
