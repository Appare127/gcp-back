import 'dotenv/config'; // 確保測試時也能讀到 .env
import request from 'supertest';
import app from '../src/app'; // 引入您的 Express App
import prisma from '../src/prisma'; // 引入 prisma 實例來關閉連線

describe('User API 測試', () => {
  const USER_BASE_URL = '/api/users'; // <--- 定義基礎路徑

  // 加上這段，解決「測試跑完後不會自動結束」的問題
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 測試案例 1：註冊資料不完整時，應該報錯
  it('應該在註冊資料不完整時回傳 400', async () => {
    const res = await request(app).post(`${USER_BASE_URL}/register`).send({
      account: 'incomplete'
      // 漏掉其他欄位
    });

    // 斷言 (Assert)：預期結果應該要是 400
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  // 測試案例 2：測試打招呼 API 是否正常
  it('應該能成功呼叫 Hello API', async () => {
    const res = await request(app).get(`${USER_BASE_URL}/hello`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
