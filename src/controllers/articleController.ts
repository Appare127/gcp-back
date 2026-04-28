import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import {
  createArticleService,
  getAllArticlesService
} from '../services/articleService';

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
    const articles = await getAllArticlesService();

    res.status(200).json({
      success: true,
      results: articles.length,
      data: articles
    });
  }
);
