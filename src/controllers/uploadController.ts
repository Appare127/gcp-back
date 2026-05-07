import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '@/utils/catchAsync';
import { AppError } from '@/utils/appError';
import { uploadToGCS } from '@/gcs';

export const uploadSingleImage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Multer 會把檔案資訊放在 req.file
    if (!req.file) {
      return next(new AppError('請選擇要上傳的圖片', 400));
    }

    // 1. 呼叫雲端上傳工具
    const imageUrl = await uploadToGCS(req.file);

    res.status(200).json({
      success: true,
      message: '圖片上傳成功！',
      data: {
        url: imageUrl
      }
      // data: {
      //   filename: req.file.filename,
      //   path: req.file.path,
      //   size: req.file.size
      // }
    });
  }
);
