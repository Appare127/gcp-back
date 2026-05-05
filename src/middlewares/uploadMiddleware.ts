import multer from 'multer';
import path from 'path';
import { AppError } from '@/utils/appError';

// 1. 設定儲存位置與檔名規則
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // 檔案存放在這裡
  },
  filename: (req, file, cb) => {
    // 重新命名：時間戳記-隨機數.副檔名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

// 2. 設定過濾器：只允許圖片
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('請上傳圖片格式檔案！', 400), false);
  }
};

// 3. 初始化 Multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 限制 2MB
  }
});
