import { PrismaClient } from './generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. 取得環境變數中的網址
const connectionString = process.env.DATABASE_URL;

// 2. 建立原生 PostgreSQL 連線池
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 3. 把轉接器塞給 Prisma，滿足他要求的「1 個參數」
const prisma = new PrismaClient({ adapter });

export default prisma;
