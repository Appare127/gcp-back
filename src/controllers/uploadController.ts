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
import { analyzeIpCsvStream } from '@/services/ipAnalysisService';
import {
  checkSingleIpFirehol,
  analyzeCsvWithFirehol
} from '@/services/fireholService';

/**
 * 上傳並即時分析 IP CSV 檔案控制器 (GeoLite2 方法)
 */
export const uploadAndAnalyzeGeoLiteCsv = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(new AppError('請選擇要上傳的 CSV 檔案', 400));
    }

    // 調用分析服務解析 Buffer 內容
    const analysisResult = await analyzeIpCsvStream(req.file.buffer);

    res.status(200).json({
      success: true,
      message: 'GeoLite2 CSV 分析完成！',
      data: analysisResult
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
 * 上傳 CSV 檔案進行線上 FireHOL Level 1 黑名單比對
 */
export const uploadAndAnalyzeFireholCsv = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(new AppError('請選擇要上傳的 CSV 檔案', 400));
    }

    const result = await analyzeCsvWithFirehol(req.file.buffer);

    res.status(200).json({
      success: true,
      message: 'FireHOL 黑名單比對完成！',
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
