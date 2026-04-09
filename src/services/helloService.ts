import prisma from '../prisma';

export async function getHelloMessage(): Promise<any> {
  // 👇 透過 Prisma 去資料庫撈出所有的 User
  const users = await prisma.user.findMany();

  // 如果資料庫是空的，我們就叫 Prisma 順手寫入一筆測試資料！
  if (users.length === 0) {
    const newUser = await prisma.user.create({
      data: {
        name: 'GCP 大師',
        email: 'test@gcp.com'
      }
    });

    return {
      message: '資料庫原來是空的，已為您自動寫入第一筆測試使用者！',
      user: newUser
    };
  }

  // 如果已經有資料了，就把資料庫的內容秀出來
  return {
    message: '後端三層架構運作正常！成功讀取資料囉！',
    users: users
  };
}
