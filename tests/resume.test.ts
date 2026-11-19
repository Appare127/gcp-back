import 'dotenv/config';
import type { Request, Response, NextFunction } from 'express';
import prisma from '../src/prisma';
import { getResumeContactInfo } from '../src/controllers/resumeController';
import { getResumeContactInfoService } from '../src/services/resumeService';
import { AppError } from '../src/utils/appError';

jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    resume: {
      findFirst: jest.fn()
    },
    $disconnect: jest.fn()
  }
}));

describe('Resume Contact Info API 測試', () => {
  const mockedFindFirst = prisma.resume.findFirst as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('應該成功從 Resume 資料表取得履歷聯絡資訊並回傳標準格式 (200)', async () => {
    mockedFindFirst.mockResolvedValue({
      phone: '0928-xxxxxx',
      email: 'apparexxxxxx@gmail.com'
    });

    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await getResumeContactInfo(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { id: 'desc' },
      select: {
        phone: true,
        email: true
      }
    });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: {
        phone: '0928-xxxxxx',
        email: 'apparexxxxxx@gmail.com'
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('當找不到啟用的履歷資料時應該拋出 404 AppError', async () => {
    mockedFindFirst.mockResolvedValue(null);

    await expect(getResumeContactInfoService()).rejects.toMatchObject<
      Partial<AppError>
    >({
      statusCode: 404,
      message: '找不到履歷聯絡資訊'
    });
  });
});
