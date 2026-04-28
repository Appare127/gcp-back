import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * 建立 Redis 客戶端實體
 */
const redis = new Redis(redisUrl);
// 監聽連線事件，方便我們在終端機看到狀態
redis.on('connect', () => {
  console.log('Redis 已成功連線');
});
redis.on('error', (err) => {
  console.error('Redis 連線失敗:', err);
});
export default redis;
