import { Router } from 'express';
import {
  uploadSingleImage,
  getDriveFiles,
  createFolder,
  deleteFile
} from '@/controllers/uploadController';
import { upload } from '@/middlewares/uploadMiddleware';

const router = Router();

// 'image' 必須跟前端傳來的欄位名稱 (Key) 一致
router.post('/single', upload.single('image'), uploadSingleImage);

router.get('/files', getDriveFiles);

router.post('/folder', createFolder);
router.delete('/files/:id', deleteFile);

export default router;
