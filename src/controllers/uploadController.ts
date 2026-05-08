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
