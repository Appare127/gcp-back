// 三大區塊：2
//  Controllers (控制器層)
// 主要職責：請求接收者與指揮官。
// 負責做什麼：
// 接收來自 Routes 的 HTTP Request (包含 req.body, req.query, req.params)。
// 將解析好的參數傳遞給下層的 Service 來執行具體任務。
// 接收 Service 處理完的結果，並決定以什麼樣的 HTTP 狀態碼 (StatusCode，如 200, 400, 500) 與 JSON 格式回傳給 Client 端。
// 捕捉與處理來自 Service 的錯誤 (Error Handling)。

// 不該做什麼：不應該參與真正的「業務邏輯判斷」或「下 SQL 指令」。它的任務只是「HTTP 協定」與「業務邏輯」之間的橋樑。

import type { Request, Response, NextFunction } from 'express';
import {
  createUserService,
  loginUserService,
  getUserInfoService
} from '../services/userService';

import { AppError } from '../utils/appError';
import { catchAsync } from '../utils/catchAsync';
import { decryptWithRsa } from '../utils/crypto';

/**
 * 嘗試以 RSA 私鑰解密密碼；若傳入本身已是明文（例如註冊前端直接傳明文或本地測試），則回傳原字串
 */
function resolvePlainPassword(inputPassword: unknown): string {
  if (typeof inputPassword !== 'string' || !inputPassword) {
    return '';
  }
  try {
    return decryptWithRsa(inputPassword);
  } catch {
    return inputPassword;
  }
}

/**
 * 驗證註冊資料格式 (Step 2 新增)
 */
function validateRegisterData(data: any): {
  isValid: boolean;
  message?: string;
} {
  const { account, password, email, birthday, phone } = data;

  if (!account || !password || !email || !birthday || !phone) {
    return { isValid: false, message: '所有欄位皆為必填' };
  }

  // 帳號與密碼驗證 (6碼以上英數混合)
  const accountPwdRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{6,}$/;
  if (!accountPwdRegex.test(account)) {
    return {
      isValid: false,
      message: '帳號格式錯誤：至少6碼，且必須包含英文與數字，不得有特殊符號'
    };
  }
  if (!accountPwdRegex.test(password)) {
    return {
      isValid: false,
      message: '密碼格式錯誤：至少6碼，且必須包含英文與數字，不得有特殊符號'
    };
  }

  // Email 驗證
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Email 格式不正確' };
  }

  // 手機驗證 (09開頭，共10碼)
  const phoneRegex = /^09\d{8}$/;
  if (!phoneRegex.test(phone)) {
    return {
      isValid: false,
      message: '手機號碼格式錯誤，必須為 09 開頭且總共 10 碼'
    };
  }

  // 生日格式驗證
  const parsedDate = Date.parse(birthday);
  if (isNaN(parsedDate)) {
    return { isValid: false, message: '生日日期格式錯誤' };
  }

  return { isValid: true };
}

// === 修改我們原本的註冊 Controller ===
export async function registerUser(req: Request, res: Response): Promise<void> {
  try {
    // 支援前端傳送 RSA 加密密文或明文密碼，先還原出真實密碼再進行格式校驗與雜湊
    const plainPassword = resolvePlainPassword(req.body?.password);
    const registerPayload = {
      ...req.body,
      password: plainPassword
    };

    // ▼ ▼ 在這裡把守門員 (驗證) 加進去！ ▼ ▼
    const validationResult = validateRegisterData(registerPayload);
    if (!validationResult.isValid) {
      // 驗證沒通過，直接給 400 錯誤並退回
      res.status(400).json({
        success: false,
        message: validationResult.message
      });
      return;
    }

    // 把檢查過關的資料丟進 Service 裡面處理
    const serviceResult = await createUserService(registerPayload);
    if (!serviceResult.success) {
      // 如果 Service 說失敗 (例如帳號重複)，一樣退回 400 錯誤
      res.status(400).json({
        success: false,
        message: serviceResult.message
      });
      return;
    }

    // 全部通關，回傳 201 成功，並附上剛建立的使用者資料（不含密碼）
    res.status(201).json({
      success: true,
      message: '註冊成功！',
      data: serviceResult.user
    });
  } catch (error) {
    console.error('註冊發生錯誤：', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
}

/**
 * 處理登入請求的控制器
 * @param req 請求
 * @param res 回應
 * @param next 下一個 middleware
 * @returns Promise<void>
 */
export const loginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { account, password } = req.body;

    if (!account || !password) {
      return next(new AppError('請輸入帳號與密碼', 400));
    }

    const serviceResult = await loginUserService({
      account,
      password
    });
    if (!serviceResult.success || !serviceResult.token) {
      return next(new AppError(serviceResult.message || '登入失敗', 401));
    }

    // 設定 HttpOnly Session Cookie（不設定 maxAge 與 expires，關閉瀏覽器即自動清除）
    res.cookie('token', serviceResult.token, {
      httpOnly: true, // 禁止前端 JS 讀取，防範 XSS
      secure: process.env.NODE_ENV === 'production', // 線上 HTTPS 環境強制加密傳輸
      sameSite: 'lax', // 防範 CSRF
      path: '/'
    });

    res.status(200).json({
      success: true,
      message: '登入成功!',
      user: serviceResult.user
    });
  }
);

/**
 * 取得當前登入用戶資料
 * @param req
 * @param res
 * @param next
 */
export const getUserInfo = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 從 authenticateToken 中介軟體解密後掛載在 req.user 的資料中取出 userId
    const userId = (req as any).user?.userId;

    if (!userId) {
      return next(new AppError('未授權，找不到用戶資訊', 401));
    }

    const serviceResult = await getUserInfoService(userId);
    if (!serviceResult.success) {
      return next(new AppError(serviceResult.message || '找不到用戶', 404));
    }

    res.status(200).json({
      success: true,
      message: '取得用戶資料成功',
      data: serviceResult.user
    });
  }
);

export const userLogout = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  res.status(200).json({
    success: true,
    message: '登出成功'
  });
});
