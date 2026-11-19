import 'dotenv/config';
import type { Request, Response, NextFunction } from 'express';
import prisma from '../src/prisma';
import redis from '../src/redis';
import { getHealthStatus } from '../src/controllers/healthController';

jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    $disconnect: jest.fn()
  }
}));

jest.mock('../src/redis', () => ({
  __esModule: true,
  default: {
    ping: jest.fn()
  }
}));

describe('Health API 測試', () => {
  const originalGitCommit = process.env.GIT_COMMIT;
  const mockedQueryRaw = prisma.$queryRaw as jest.Mock;
  const mockedRedisPing = redis.ping as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalGitCommit === undefined) {
      delete process.env.GIT_COMMIT;
    } else {
      process.env.GIT_COMMIT = originalGitCommit;
    }
  });

  it('當資料庫與 Redis 都正常時應該回傳 200 與設定的 GIT_COMMIT', async () => {
    process.env.GIT_COMMIT = 'a1b2c3d';
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedRedisPing.mockResolvedValue('PONG');

    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    getHealthStatus(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        status: 'ok',
        commit: 'a1b2c3d',
        checks: {
          database: expect.objectContaining({ status: 'up' }),
          redis: expect.objectContaining({ status: 'up' })
        }
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('當未設定 GIT_COMMIT 時應該回傳 unknown', async () => {
    delete process.env.GIT_COMMIT;
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedRedisPing.mockResolvedValue('PONG');

    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    getHealthStatus(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(status).toHaveBeenCalledWith(200);
    expect(json.mock.calls[0][0].commit).toBe('unknown');
  });

  it('當資料庫或 Redis 異常時應該回傳 503', async () => {
    process.env.GIT_COMMIT = 'a1b2c3d';
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedRedisPing.mockRejectedValue(new Error('Redis connection refused'));

    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    getHealthStatus(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        status: 'error',
        commit: 'a1b2c3d',
        checks: {
          database: expect.objectContaining({ status: 'up' }),
          redis: expect.objectContaining({ status: 'down' })
        }
      })
    );
  });
});
