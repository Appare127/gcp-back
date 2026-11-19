import prisma from '../prisma';
import { AppError } from '../utils/appError';

export interface ResumeContactInfo {
  phone: string;
  email: string;
}

/**
 * 取得目前啟用中的履歷聯絡資訊（從 Resume 資料表查詢）
 * @returns 包含 phone 與 email 的聯絡資訊物件
 */
export async function getResumeContactInfoService(): Promise<ResumeContactInfo> {
  const resume = await prisma.resume.findFirst({
    where: { isActive: true },
    orderBy: { id: 'desc' },
    select: {
      phone: true,
      email: true
    }
  });

  if (!resume) {
    throw new AppError('找不到履歷聯絡資訊', 404);
  }

  return {
    phone: resume.phone,
    email: resume.email
  };
}
