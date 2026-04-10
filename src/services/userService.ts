import prisma from '../prisma'; // 連線資料庫的工具
import bcrypt from 'bcryptjs'; // 我們剛剛裝的加密工具

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
