import 'dotenv/config';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { loginUser } from '../src/controllers/userController';
import { authenticateToken } from '../src/middlewares/authMiddleware';
import * as userService from '../src/services/userService';

describe('登入 HttpOnly Session Cookie 與驗證測試', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('POST /api/users/login 應該設定無 maxAge/expires 的 HttpOnly Session Cookie 且不回傳 token', async () => {
    jest.spyOn(userService, 'loginUserService').mockResolvedValue({
      success: true,
      message: '登入成功',
      token: 'mock-jwt-token',
      user: {
        account: 'appare1234',
        email: 'appare@example.com',
        phone: '0928000000',
        createdAt: new Date('2026-01-01T00:00:00.000Z')
      }
    });

    const req = {
      body: { account: 'appare1234', password: 'Password123' }
    } as Request;
    const cookie = jest.fn();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { cookie, status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    loginUser(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(cookie).toHaveBeenCalledWith('token', 'mock-jwt-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    const cookieOptions = cookie.mock.calls[0][2];
    expect(cookieOptions.maxAge).toBeUndefined();
    expect(cookieOptions.expires).toBeUndefined();

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: '登入成功!',
      user: expect.objectContaining({ account: 'appare1234' })
    });
    expect(json.mock.calls[0][0].token).toBeUndefined();
  });

  it('authenticateToken 應該能從 Cookie Header 解析 token 並通過驗證', () => {
    const signedToken = jwt.sign(
      { userId: 1, account: 'appare1234' },
      'test-secret-key'
    );

    const req = {
      headers: {
        cookie: `other=123; token=${encodeURIComponent(signedToken)}`
      }
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user).toMatchObject({
      userId: 1,
      account: 'appare1234'
    });
  });
});
