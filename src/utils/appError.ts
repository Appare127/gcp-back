/**
 * 自定義錯誤類別，繼承自原生 Error
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    // 標記這是我們主動拋出的「已知錯誤」(例如密碼錯誤)，而不是程式當掉的「未知錯誤」
    this.isOperational = true;
    // 抓取「錯誤發生在哪一行」的詳細資訊 (StackTrace)
    Error.captureStackTrace(this, this.constructor);
  }
}
