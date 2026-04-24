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
      content: articaleData.content,
      authorId: authorId
    }
  });
  return newArticle;
}
