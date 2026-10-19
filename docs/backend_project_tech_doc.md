# 耿網後端 (gcp-back) 專案技術文件

> **最後更新日期**：2026-10-19

本文件旨在提供 `gcp-back` 後端專案的核心技術架構、資安分析引擎、雲端整合、模組職責與設計規範，以便未來的開發者與 AI 助手快速掌握系統現況與擴充方向。

---

## 1. 專案基本資訊 (Project Overview)

* **專案名稱**：`gcp-back`
* **核心框架**：Node.js + Express 5 (`express@5.2.1`)
* **語言與編譯**：TypeScript 6.0 + `tsx` (開發環境零延遲熱重載 `tsx watch`)
* **資料庫與 ORM**：PostgreSQL + Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`)
* **快取系統**：Redis (`ioredis@5.10.1`)
* **雲端儲存**：
  * **Google Cloud Storage** (`@google-cloud/storage`)：公共圖片與靜態資源託管
  * **Google Drive API** (`googleapis` OAuth 2.0)：個人大容量雲端硬碟自動化儲存
* **AI 智慧分析引擎**：Google GenAI SDK (`@google/genai`)，使用 `gemini-3-flash-preview` 進行即時風險與代理屬性判定
* **資安威脅與情資庫**：
  * **MaxMind GeoLite2** (`maxmind`)：ASN 與地理位置查詢
  * **FireHOL Level 1 & Level 2**：全球惡意 IP 黑名單比對 (IPv4)
  * **Spamhaus DROPv6**：IPv6 專屬重大威脅網段比對
* **API 文檔系統**：OpenAPI 3.0 + Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)
* **安全與加密**：`bcryptjs` (密碼雜湊)、`jsonwebtoken` (JWT 鑑權)、Node.js `crypto` (RSA 非對稱金鑰解密)

---

## 2. 系統架構與分層職責 (Three-Tier Architecture)

本專案嚴格遵循職責分離原則，分為三層架構：

```text
HTTP Request 
   ⬇
[ Routes 路由層 ]        -> 請求進入點、URL 分派、Middleware 驗證 (Auth / Upload)
   ⬇
[ Controllers 控制層 ]   -> Request 參數解析、呼叫 Service、回傳標準 JSON Response
   ⬇
[ Services 服務層 ]      -> 核心商業邏輯、資安情資比對、演算法、外部 API / 資料庫存取
```

### 2.1 Routes (路由層，`src/routes/`)
* **職責**：API 進入點總機。
* **規範**：只負責 URL 路徑定義與中介軟體（如 `authMiddleware`、`uploadMiddleware`）配置，**絕對不寫任何資料庫讀寫或業務判斷**。
* **主要模組**：
  * `userRoutes.ts`：會員註冊、登入、個人資料操作。
  * `articleRoutes.ts`：文章增刪改查。
  * `uploadRoutes.ts`：檔案上傳、GeoLite2 分析、FireHOL 黑名單比對。

### 2.2 Controllers (控制層，`src/controllers/`)
* **職責**：處理 HTTP 請求與回應。
* **規範**：
  * 使用 `catchAsync` 統一捕捉非同步異常，自動轉交全域錯誤中介軟體處理，免去重複的 `try-catch`。
  * 解構 `req.body`、`req.query`、`req.file` 並進行基礎校驗，呼叫 Service 層後封裝標準格式回傳：
    `{ success: true, message: string, data: any }`。

### 2.3 Services (服務邏輯層，`src/services/`)
* **職責**：純商業邏輯與演算法核心。
* **主要服務**：
  * [`ipAnalysisService.ts`](file:///d:/code/gcp-back/src/services/ipAnalysisService.ts)：GeoLite2 ASN/地理分析、網段聚合、詳細清單產生。
  * [`fireholService.ts`](file:///d:/code/gcp-back/src/services/fireholService.ts)：FireHOL Level 1 & Level 2 與 Spamhaus DROPv6 雙軌黑名單引擎。
  * [`aiAgentService.ts`](file:///d:/code/gcp-back/src/services/aiAgentService.ts)：Gemini AI Agent 即時資安代理屬性評估。
  * [`userService.ts`](file:///d:/code/gcp-back/src/services/userService.ts)：使用者管理、密碼雜湊、JWT Token 簽發。

---

## 3. 核心資安防護與情資引擎 (Threat Intelligence Architecture)

### 3.1 GeoLite2 與 ISP 角色分類聚合 (`ipAnalysisService.ts`)
* **單一 IP 查詢** (`checkSingleIpGeoLite`)：
  * 即時查詢 MaxMind ASN 與 City 資料庫（單例模式讀取器，避免重複載入 60MB 檔案）。
  * 同步發起 FireHOL 黑名單比對與 Gemini AI Agent 深度評估。
* **巨量日誌批次聚合分析** (`analyzeIpCsvStream`)：
  * **引號與格式兼容**：內建 `parseCsvLine`，相容純逗號與帶雙引號（如 Kibana、Elasticsearch 匯出）格式，自動過濾多語系標題列。
  * **雙層聚合呈現**：
    1. **單一 IP Top 30**：依真實請求數遞減排序。
    2. **巨量聚合網段 Top 30**：IPv4 自動聚合為 `/24` (Class C)，IPv6 自動聚合為 `/64`。
  * **產業角色分類庫 (`classifyProvider`)**：
    * 涵蓋：主機供應商 (Hosting)、電信業者 (ISP)、CDN／網路防護商、政府機構、教育學術單位等。
    * 支援全球主要雲端與機房特徵庫（AWS, GCP, Azure, Cloudflare, OVH, Byteplus, The Constant Company 等）。
  * **效能保護開關 (`includeDetail`)**：
    * 預設為 `false`，回傳 `detailList: []`，大幅縮減十萬筆日誌的傳輸頻寬與 JSON 序列化開銷。
    * 當前端傳入 `includeDetail=true` 時，若檔案在 1,000 筆內 **100% 完整呈現**；超過 1,000 筆則取請求量前 1,000 筆詳細資訊，防止前端瀏覽器 DOM 崩潰。
  * **繁體中文國家格式化 (`formatCountryWithChinese`)**：
    * 內建全球主要 50+ 國標準繁中對照表，回傳格式為 `代碼 (中文名稱)`（如 `JP (日本)`、`TW (台灣)`、`US (美國)`），無縫對接前端表格。

### 3.2 FireHOL (Level 1 & Level 2) 與 Spamhaus DROPv6 雙軌黑名單 (`fireholService.ts`)
* **多層威脅防衛體系**：
  * **FireHOL Level 1 (IPv4)**：最高信賴度、0 誤判的嚴重惡意黑名單（Spamhaus DROP、DShield 等），標記為 `High Risk`。
  * **FireHOL Level 2 (IPv4)**：過去 48 小時內活躍的攻擊源、漏洞掃描與惡意爬蟲（Blocklist.de 等），標記為 `Medium-High Risk`。
  * **Spamhaus DROPv6 (IPv6)**：專為 IPv6 設計的重大惡意網段黑名單。
* **高效能區間二元搜尋演算法**：
  * 載入時將 CIDR 轉換為數值閉區間 `[start, end]`（IPv4 為數值，IPv6 為 128 位元 `BigInt`）並進行區間合併。
  * 採用二元搜尋法（Binary Search），即使比對上萬個網段，單次比對耗時僅需 **0.001 毫秒**。
* **高可用快取與容災機制**：
  * **記憶體快取**：12 小時 TTL，避免頻繁發起外網請求。
  * **磁碟備援機制**：自動備份至 `data/firehol_level1.netset`、`data/firehol_level2.netset`、`data/spamhaus_dropv6.txt`。若重啟時遇外網斷線，自動降級讀取本地檔案，保證服務 100% 正常。

### 3.3 Gemini AI Agent 深度評估引擎 (`aiAgentService.ts`)
* **模型**：`gemini-3-flash-preview`。
* **評估內容**：
  * `connectionType`：連線類型判定（如 `ISP (家用/寬頻)`、`Hosting / Datacenter`、`CDN / Proxy`）。
  * `riskAssessment`：結合黑名單歷史與請求頻次的專業繁中資安摘要評估。
  * `riskLevel`：風險等級判定（高風險、中風險、低至中、低風險）。
* **快取與備援**：
  * **24 小時記憶體快取**：相同特徵或重複查詢之 IP 不重複耗費 API 額度。
  * **本機規則備援 (`generateFallbackAssessment`)**：AI 瞬斷或 API 逾時時，自動無縫切換至本地靜態規則，確保查詢穩定。

---

## 4. 雲端儲存與 OAuth 整合架構 (Cloud Storage & OAuth)

### 4.1 Google Cloud Storage (GCS，`src/gcs.ts`)
* **用途**：公開圖片與靜態資源託管。
* **認證**：採用服務帳號金鑰 `gcp-storage-image-key.json`。
* **機制**：以串流 (Stream) 形式直傳 GCS Bucket，自動加上時間戳檔名避免覆蓋，並回傳公開可存取之 URL。

### 4.2 Google Drive OAuth 2.0 (個人空間，`src/drive.ts`)
* **用途**：解決 GCP Service Account 無儲存配額之限制，串接個人 Google One 大容量空間（如 2TB / 6TB）。
* **認證**：OAuth 2.0 Client ID + Client Secret + 永久有效之 Refresh Token。
* **機制**：
  * 支援直接上傳至指定主資料夾或子資料夾。
  * 上傳後自動調用 Drive Permissions API 將檔案設為公開檢視者 (`role: reader, type: anyone`)。
* **設定細節**：完整設定與換金鑰流程請參閱 [`docs/google-drive-oauth-guide.md`](file:///d:/code/gcp-back/docs/google-drive-oauth-guide.md)。

---

## 5. 全域錯誤處理與安全性規範 (Error Handling & Security)

### 5.1 全域錯誤處理流程
* **自訂錯誤類別 (`AppError`)**：繼承原生 `Error`，攜帶 HTTP 狀態碼與 `isOperational`（標記為可預期操作錯誤）。
* **非同步捕捉器 (`catchAsync`)**：將 Express Route Handler 包裝成 Promise，出錯時自動 `next(err)`。
* **全域錯誤中介軟體 (`globalErrorHandler`)**：
  * **開發環境**：回傳詳細的錯誤堆疊 (Stack Trace) 以利除錯。
  * **生產環境**：隱藏內部程式碼細節，僅回傳安全且友善的錯誤訊息。

### 5.2 安全性設計
* **密碼前端加密傳輸**：前端透過 JSEncrypt 使用 RSA 公鑰加密，後端 `src/utils/crypto.ts` 私鑰解密後，再使用 `bcryptjs` 進行 10 次 Salt 加密雜湊儲存。
* **JWT 鑑權機制**：`src/middlewares/authMiddleware.ts` 驗證 Bearer Token，並將使用者資訊掛載至 `req.user`。
* **CORS 跨網域**：透過 `cors()` 中介軟體允許前端應用程式跨域連線。

---

## 6. Swagger API 文檔系統 (API Documentation)

* **文檔路由**：`GET /api-docs`
* **文檔規範**：OpenAPI 3.0 / Swagger 2.0。
* **架構組織**：
  * [`src/swagger.ts`](file:///d:/code/gcp-back/src/swagger.ts)：Swagger 配置與 JSDoc 掃描進入點。
  * [`src/docs/schemas/analysis.schema.ts`](file:///d:/code/gcp-back/src/docs/schemas/analysis.schema.ts)：集中管理所有 GeoLite2、FireHOL、Spamhaus 的資料模型（Models）與回應範例（Responses）。

---

## 7. 專案目錄結構 (Directory Structure)

```text
gcp-back/
├── data/                    # 本地離線備援資料庫
│   ├── GeoLite2-ASN.mmdb    # MaxMind ASN 資料庫
│   ├── GeoLite2-City.mmdb   # MaxMind 城市與國家資料庫
│   ├── firehol_level1.netset# FireHOL Level 1 本地備援
│   ├── firehol_level2.netset# FireHOL Level 2 本地備援
│   └── spamhaus_dropv6.txt  # Spamhaus DROPv6 本地備援
├── docs/                    # 專案技術文檔目錄
│   ├── backend_project_tech_doc.md # 本技術文件
│   └── google-drive-oauth-guide.md # Google Drive OAuth 整合手冊
├── prisma/                  # Prisma ORM 模型配置
│   └── schema.prisma        # 資料庫 Schema (User, Article)
├── src/
│   ├── controllers/         # 控制層 (HTTP 參數解析與回應封裝)
│   │   ├── articleController.ts
│   │   ├── uploadController.ts   # CSV 與 IP 查詢主要控制器
│   │   └── userController.ts
│   ├── docs/                # OpenAPI / Swagger Schema 定義
│   │   └── schemas/
│   │       └── analysis.schema.ts
│   ├── middlewares/         # 中介軟體
│   │   ├── authMiddleware.ts    # JWT 鑑權
│   │   ├── errorMiddleware.ts   # 全域錯誤攔截
│   │   └── uploadMiddleware.ts  # Multer 檔案暫存
│   ├── routes/              # 路由定義層
│   │   ├── articleRoutes.ts
│   │   ├── index.ts             # 根路由聚合 (/api)
│   │   ├── uploadRoutes.ts      # 資安分析與上傳路由
│   │   └── userRoutes.ts
│   ├── services/            # 核心服務與演算法層
│   │   ├── aiAgentService.ts    # Gemini 3 AI Agent 評估
│   │   ├── articleService.ts
│   │   ├── fireholService.ts    # FireHOL L1/L2 + Spamhaus 黑名單引擎
│   │   ├── helloService.ts
│   │   ├── ipAnalysisService.ts # GeoLite2 ISP 聚合與分類分析
│   │   └── userService.ts
│   ├── utils/               # 共用輔助函式庫
│   │   ├── appError.ts          # 自訂業務錯誤
│   │   ├── catchAsync.ts        # 非同步異常捕捉
│   │   └── crypto.ts            # RSA 解密工具
│   ├── app.ts               # Express App 實例與全域中介軟體掛載
│   ├── drive.ts             # Google Drive OAuth 2.0 串接
│   ├── gcs.ts               # Google Cloud Storage 串接
│   ├── prisma.ts            # Prisma Client 單例
│   ├── redis.ts             # Redis Client 單例
│   ├── server.ts            # 應用程式啟動進入點 (Port 3000)
│   └── swagger.ts           # Swagger UI 設定
├── package.json
└── tsconfig.json
```

---

## 8. NPM 常用指令 (NPM Scripts)

* **`npm run dev`**：啟動本地開發服務器 (使用 `tsx watch` 支援熱重載，預設 Port 3000)
* **`npm run build`**：執行 TypeScript 編譯輸出至 `dist/` 目錄
* **`npm start`**：以 Node 執行編譯後的生產環境程式碼 (`node dist/server.js`)
* **`npm run lint`**：執行 ESLint 代碼品質與風格檢查
* **`npm test`**：執行 Jest 單元與整合測試
