import type { Request, Response } from 'express';
import { getHelloMessage } from '../services/helloService';

export async function sayHello(req: Request, res: Response): Promise<void> {
  try {
    // 👇 這裡加上 await 等待 Service 從資料庫拿資料回來
    const result = await getHelloMessage();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    // 順便把錯誤印在後端終端機，方便我們未來除錯
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}
