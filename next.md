專案總結報告：GCP-Back 專業後端架構

這是一份精簡的開發快照，包含專案的技術棧、架構邏輯與目前進度，能讓新的 AI 助手在幾秒鐘內理解專案全貌。

1. 核心技術棧 (Tech Stack)
   語言: TypeScript 5.x / 6.x
   框架: Express.js
   資料庫: PostgreSQL (透過 Prisma ORM)
   快取系統: Redis (src/redis.ts)
   雲端儲存: GCP Cloud Storage (src/gcs.ts)
   文件: Swagger (OpenAPI 3.0, 採模組化設計)
   測試: Jest + Supertest (tests/)

2. 專案架構 (Project Architecture)
   採用嚴謹的 三層式架構 (Three-Tier Architecture)，確保邏輯分離：
   Routes: src/routes/ (已實作分類掛載，如 /api/users, /api/articles)
   Controllers: src/controllers/ (處理 HTTP 請求，調用 Service)
   Services: src/services/ (處理純業務邏輯與資料庫操作)

3. 已完成的核心功能
   🔐 身份驗證與安全
   實作 bcryptjs 密碼加密。
   實作 JWT Token 簽發與驗證。
   提供 authMiddleware 保護敏感路由。

📄 文章系統
實作 User 與 Article 的 一對多 (1:N) 關聯。
支援文章建立、查詢（包含作者資訊聯表）。

🚀 進階模組
Redis 快取: 已建立連線實例，支援資料快速讀取。
GCP 圖片上傳: 使用 multer + @google-cloud/storage，支援直接將檔案流傳輸至雲端 Bucket。
全域錯誤處理: 具備自定義 AppError 與全域 Error Middleware，確保 API 回傳格式統一。

📚 自動化文件與測試
Swagger: 採用「策略一：模組化 Schema」架構，定義於 src/docs/schemas/，路徑簡潔。
Automated Tests: 已設定 jest --forceExit，包含基礎 User API 測試。

4. 環境變數規範 (.env)
   專案依賴以下關鍵變數：
   DATABASE_URL: PostgreSQL 連線字串。
   JWT_SECRET: JWT 防偽金鑰。
   REDIS_URL: Redis 連線位址。
   GCS_BUCKET_NAME: GCP 儲存桶名稱。
   GOOGLE_APPLICATION_CREDENTIALS: GCP 服務帳號金鑰路徑。

5. 後續開發建議
   Redis 實戰應用: 為 GET /articles 加上快取機制，降低資料庫負擔。
   軟刪除 (Soft Delete): 在 Prisma Schema 中加入 deletedAt 欄位。
   部署準備: 撰寫 Dockerfile 以利部署至 GCP Cloud Run。

給新 AI 的開發者指令：
「請依照目前專案的『三層式架構』與『模組化 Swagger 規範』繼續開發。在修改 API 時，優先檢查 src/docs/schemas/ 是否需要同步更新，並確保所有 Service 都有正確的型別定義。測試環境請使用 NODE_OPTIONS=--experimental-vm-modules (若為 ESM 模式) 或現有 ts-jest 配置。」
