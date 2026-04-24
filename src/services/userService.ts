import jwt from 'jsonwebtoken';
import prisma from '../prisma'; // 連線資料庫的工具
import bcrypt from 'bcryptjs'; // 我們剛剛裝的加密工具
import { SignOptions } from 'jsonwebtoken';

// 負責執行「註冊」的核心商業邏輯
export async function createUserService(data: any) {
  // 【動作一】：檢查帳號是否已經存在
  const existingUser = await prisma.user.findUnique({
    where: { account: data.account }
  });

  if (existingUser) {
    // 發現帳號重複，直接退回，不往下執行
    return { success: false, message: '這個帳號已經被註冊過囉！' };
  }

  // 【動作二】：對密碼進行雜湊加鹽加密
  // 10 是「鹽 (Salt)」的強度，數字越大越難破解，但伺服器計算也會越慢，10 是業界標準
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // （因為資料庫規定 birthday 是 DateTime 格式，我們把字串轉成真正的日期時間）
  const parsedBirthday = new Date(data.birthday);

  // 【動作三】：正式將資料寫入資料庫
  const newUser = await prisma.user.create({
    data: {
      account: data.account,
      password: hashedPassword, // 強烈注意：這裡存的是打亂後的密碼！
      email: data.email,
      birthday: parsedBirthday,
      phone: data.phone
    }
  });

  // 【動作四】：防呆機制 -> 把密碼從回傳結果中抽離，絕對不傳回給前端
  const { password, ...userWithoutPassword } = newUser;

  return {
    success: true,
    user: userWithoutPassword
  };
}

/**
 * 負責執行「登入」的核心商業邏輯
 */
export async function loginUserService(data: any) {
  // 【動作一】：先找找看資料庫有沒有這個帳號？
  const user = await prisma.user.findUnique({
    where: { account: data.account }
  });
  if (!user) {
    // 找不到帳號，直接回絕
    return { success: false, message: '帳號或密碼錯誤' };
    // (資安小常識：報錯時不要明說「帳號不存在」，這樣駭客就無法猜測哪些帳號有註冊)
  }

  // 【動作二】：比對密碼
  // 使用 bcrypt.compare 比較「前端傳來的明文密碼」跟「資料庫存的雜湊加密密碼」
  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    // 密碼比對失敗
    return { success: false, message: '帳號或密碼錯誤' };
  }

  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;
  if (!secret || !expiresIn) {
    throw new Error('環境變數 JWT_SECRET 或 JWT_EXPIRES_IN 未設定');
  }

  // 【動作三】：重頭戲！密碼沒問題，核發 JWT 通行證
  const token = jwt.sign(
    { userId: user.id, account: user.account }, // 裡面夾帶的公開資訊 (Payload)
    secret, // 防偽金鑰 (Secret)
    // 使用 Required<SignOptions> 把「可選屬性」轉為「必選屬性」
    // 這樣就能精確地抓到「不含 undefined」的那個型別 (number | StringValue)
    // 如果沒有用as Required<SignOptions>['expiresIn']，最簡單的可用as any
    { expiresIn: expiresIn as Required<SignOptions>['expiresIn'] } // 設定時效
  );

  // 【動作四】：防呆，把密碼拔掉後再回傳
  const { password, ...userWithoutPassword } = user;
  return {
    success: true,
    message: '登入成功',
    token: token, // 把這張通行證回傳給前端！
    user: userWithoutPassword
  };
}
