import { Router } from 'express';
import { sayHello } from '../controllers/helloController';

const router = Router();

// 定義 GET /api/hello 網址，並指派給 sayHello 這個 Controller 處理
router.get('/hello', sayHello);

export default router;
