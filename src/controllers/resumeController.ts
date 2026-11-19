import type { Request, Response } from 'express';
import { getResumeContactInfoService } from '../services/resumeService';
import { catchAsync } from '../utils/catchAsync';

/**
 * 取得履歷聯絡資訊
 */
export const getResumeContactInfo = catchAsync(
  async (_req: Request, res: Response) => {
    const contactInfo = await getResumeContactInfoService();

    res.status(200).json({
      success: true,
      data: contactInfo
    });
  }
);
