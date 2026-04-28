import prisma from '../prisma';

export async function createArticleService(
  authorId: number,
  articaleData: {
    title: string;
    content?: string;
  }
) {
  const newArticle = await prisma.article.create({
    data: {
      title: articaleData.title,
      // 使用 ?? null，確保當 content 為 undefined 時，會轉為 null 傳給 Prisma
      content: articaleData.content ?? null,
      authorId: authorId
    }
  });
  return newArticle;
}

export async function getAllArticlesService() {
  return await prisma.article.findMany({
    include: {
      author: {
        select: {
          id: true,
          account: true, // 我們只需要作者的名字和 ID，不需要密碼
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc' // 按時間新舊排序
    }
  });
}
