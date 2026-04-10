// 三大區塊：3
//  Services (服務層)
// 主要職責：業務邏輯處理中心。
// 負責做什麼：
// 接收來自 Controller 的參數，並執行實際的商業規則 (Business Logic)。
// 負責與資料庫 (Database) 或其他外部 API 進行互動 (通常透過 ORM 工具如 Prisma)。
// 將處理結果回傳給 Controller，由 Controller 決定如何包裝成 HTTP 回應。

// 不該做什麼：不應該直接處理 HTTP 協定細節 (如 req/res) 或前端的顯示格式。

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
