import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '@/utils/catchAsync';
import { AppError } from '@/utils/appError';
import {
  createArticleService,
  getAllArticlesService
} from '@/services/articleService';
import redis from '@/redis';

export const createArticle = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user.userId;

    if (!req.body.title) {
      return next(new AppError('文章標題為必填', 400));
    }

    const article = await createArticleService(userId, req.body);

    res.status(201).json({
      success: true,
      data: article
    });
  }
);

export const getAllArticles = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `all_articles`;

    // 從Redis抓資料
    const cachedArticles = await redis.get(cacheKey);
    if (cachedArticles) {
      return res.status(200).json({
        success: true,
        results: JSON.parse(cachedArticles).length,
        data: JSON.parse(cachedArticles),
        source: 'cache' // 標記來源，方便測試
      });
    }

    // 沒取到redis資料，從DB抓
    const articles = await getAllArticlesService();

    // 將資料存入redis (EX是秒)
    await redis.set(cacheKey, JSON.stringify(articles), 'EX', 60);

    res.status(200).json({
      success: true,
      results: articles.length,
      data: articles,
      source: 'database'
    });
  }
);
