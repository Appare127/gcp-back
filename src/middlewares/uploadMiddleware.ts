import multer from 'multer';
import path from 'path';
import { AppError } from '@/utils/appError';

// // 1. 設定儲存位置與檔名規則
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/uploads'); // 檔案存放在這裡
//   },
//   filename: (req, file, cb) => {
//     // 重新命名：時間戳記-隨機數.副檔名
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     const ext = path.extname(file.originalname);
//     cb(null, `image-${uniqueSuffix}${ext}`);
//   }
// });

// 記憶體模式，檔案會存在緩衝區 (buffer) 中，不會佔用你的硬碟空間
const storage = multer.memoryStorage();

// 2. 設定過濾器：只允許圖片
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('請上傳圖片格式檔案！', 400), false);
  }
};

// 3. 初始化 Multer (圖片專用)
export const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 限制 2MB
  }
});

/**
 * 檢查是否為 CSV 檔案格式的過濾器
 */
function csvFileFilter(
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  const isCsvMime =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'text/plain' ||
    file.mimetype === 'application/vnd.ms-excel';

  if (ext === '.csv' || isCsvMime) {
    cb(null, true);
  } else {
    cb(new AppError('請上傳 CSV 格式檔案！', 400));
  }
}

/**
 * CSV 檔案上傳中介軟體（限制 50MB，記憶體緩衝區模式）
 */
export const uploadCsv = multer({
  storage: storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制 50MB
  }
});
