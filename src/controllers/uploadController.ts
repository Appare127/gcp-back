import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '@/utils/catchAsync';
import { AppError } from '@/utils/appError';

export const uploadSingleImage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Multer 會把檔案資訊放在 req.file
    if (!req.file) {
      return next(new AppError('請選擇要上傳的圖片', 400));
    }

    res.status(200).json({
      success: true,
      message: '圖片上傳成功！',
      data: {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      }
    });
  }
);
