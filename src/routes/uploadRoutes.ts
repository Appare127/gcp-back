import { Router } from 'express';
import { uploadSingleImage } from '@/controllers/uploadController';
import { upload } from '@/middlewares/uploadMiddleware';

const router = Router();

// 'image' 必須跟前端傳來的欄位名稱 (Key) 一致
router.post('/single', upload.single('image'), uploadSingleImage);

export default router;
