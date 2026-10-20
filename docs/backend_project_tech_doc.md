# 耿網後端 (gcp-back) 專案技術文件

> **最後更新日期**：2026-10-20

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
  * **AbuseIPDB API v2**：全球社群惡意檢舉歷史、濫用信心指數 (0-100%) 與連線類型情報 (搭配 Redis 24 小時快取)
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
  * `uploadRoutes.ts`：檔案上傳、GeoLite2 單一 IP 查詢、FireHOL 單一 IP 比對、AbuseIPDB 單一 IP 查詢、Security Intel 全方位安全情資分析、Gemini AI Agent 即時溝通測試。

### 2.2 Controllers (控制層，`src/controllers/`)
* **職責**：處理 HTTP 請求與回應。
* **規範**：
  * 使用 `catchAsync` 統一捕捉非同步異常，自動轉交全域錯誤中介軟體處理，免去重複的 `try-catch`。
  * 解構 `req.body`、`req.query`、`req.file` 並進行基礎校驗，呼叫 Service 層後封裝標準格式回傳：
    `{ success: true, message: string, data: any }`。

### 2.3 Services (服務邏輯層，`src/services/`)
* **職責**：純商業邏輯與演算法核心。
* **主要服務模組**：
  * **資安情報模組 (`src/services/securityIntel/`)**：
    * [`index.ts`](file:///d:/code/gcp-back/src/services/securityIntel/index.ts)：統一出口，集中導出所有資安情報函式與型別 (Facade)。
    * [`types.ts`](file:///d:/code/gcp-back/src/services/securityIntel/types.ts)：情資模組之資料介面與型別定義。
    * [`providerClassifier.ts`](file:///d:/code/gcp-back/src/services/securityIntel/providerClassifier.ts)：雲端與產業角色分類庫 (含高風險特徵關鍵字)。
    * [`geoLiteService.ts`](file:///d:/code/gcp-back/src/services/securityIntel/geoLiteService.ts)：MaxMind MMDB 二進位單例讀取與單一 IP 地理／ASN 查詢服務。
    * [`fireholService.ts`](file:///d:/code/gcp-back/src/services/securityIntel/fireholService.ts)：FireHOL Level 1 & Level 2 與 Spamhaus DROPv6 雙軌黑名單引擎（純情資提供者，專注於二元搜尋區間快取與單一 IP 查詢）。
    * [`abuseIpDbService.ts`](file:///d:/code/gcp-back/src/services/securityIntel/abuseIpDbService.ts)：AbuseIPDB 社群惡意情資整合、Redis 24 小時快取與平滑限流防護。
    * [`aiAgentService.ts`](file:///d:/code/gcp-back/src/services/securityIntel/aiAgentService.ts)：Gemini AI Agent 即時資安代理屬性評估。
    * [`securityIntelService.ts`](file:///d:/code/gcp-back/src/services/securityIntel/securityIntelService.ts)：全方位安全情報主引擎（單一 IP 綜合情資查詢，以及結合 GeoLite2 + FireHOL + AbuseIPDB 的 CSV 巨量串流單趟分析與聚合報表生成）。
  * **業務服務模組**：
    * [`userService.ts`](file:///d:/code/gcp-back/src/services/userService.ts)：使用者管理、密碼雜湊、JWT Token 簽發。
    * [`articleService.ts`](file:///d:/code/gcp-back/src/services/articleService.ts)：文章資料庫存取與業務邏輯。

---

## 3. 核心資安防護與情資引擎 (Threat Intelligence Architecture)

### 3.1 GeoLite2 地理位置與 ASN 查詢 (`geoLiteService.ts`)
* **單一 IP 查詢** (`checkSingleIpGeoLite`)：
  * 即時查詢 MaxMind ASN 與 City 資料庫（單例模式讀取器，避免重複載入 60MB 檔案）。
  * 呼叫產業分類庫 `classifyProvider` 判定連線身分（主機供應商、ISP、政府機構等）。
  * 職責徹底純化，專注於 IP 地理屬性與電信商解析，不耦合黑名單或多層報表聚合邏輯。

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
* **單一 IP 查詢精準指標 (`checkSingleIpFirehol`)**：
  * 回傳結構全面移除模糊字串，改以三大獨立布林指標清晰呈現：`ipv4ListedLevel1`、`ipv4ListedLevel2` 與 `ipv6SpamhausListed`。
  * `isListed` 綜合三項布林狀態，並依命中來源自動產生對應之資安繁中提示訊息 `message`。

### 3.3 Gemini AI Agent 深度評估引擎 (`aiAgentService.ts`)
* **模型**：`gemini-3-flash-preview`。
* **Google Search 即時聯網 Grounding**：
  * 主動透過 Google 搜尋目標 IP、聚合網段及 ASN 組織之公開資安情資（如 VirusTotal、AbuseIPDB、GreyNoise、Shodan、Cisco Talos 等社群活動紀錄與惡意通報）。
* **多維度深度評估內容**：
  * `connectionType`：連線屬性判定（例如 `Hosting / Datacenter (雲端主機)`、`ISP (家用/寬頻)`、`VPN / Proxy`、`CDN / Edge`）。
  * `riskLevel`：風險等級研判（如 `極高風險`、`高風險`、`中風險`、`低至中`、`低風險` 等）。
  * `riskAssessment`：專業資安分析評論，充分剖析網路背景、威脅態勢、可能攻擊手法（C2 通訊、殭屍網路肉雞、字典暴力破解、掃描探測或住宅代理池存取等）。
  * `onlineFindings`：Google 搜尋查得之公開威脅活動與資安通報摘要（查無則明確標示）。
  * `recommendations`：具體資安防禦或處置建議（防火牆封鎖、限流、加強驗證或正常放行等）。
  * `references`：Google Search 查得之公開參考來源網址與標題清單。
* **快取與備援機制**：
  * **24 小時記憶體快取**：鍵值包含 IP、ASN、黑名單狀態與檢舉分數，避免重複查詢耗費 API 配額。
  * **本機規則庫優雅降級 (`generateFallbackAssessment`)**：當 Google Search 工具遇 429 配額超限時，自動降級為純模型推論；若模型亦瞬斷、API 逾時或配額超額時，自動切換至本機情資規則庫，保證主流程 100% 穩定不中斷。
* **AI Agent 通訊測試端點 (`GET / POST /upload/ai-agent/test`)**：
  * **函式**：[`testAiAgentCommunication`](file:///d:/code/gcp-back/src/services/securityIntel/aiAgentService.ts)。
  * **功能**：提供開發者與資安人員隨時測試 Agent 的溝通能力、推論品質與 Google Search 即時聯網 Grounding。
  * **彈性參數**：支援自訂提示詞 (`prompt`)、系統指示 (`systemInstruction`)、是否啟用 Google Search 工具 (`enableGoogleSearch`) 與模型切換 (`model`)。未帶提示詞時自動發送標準資安 Agent 診斷指令。

### 3.4 AbuseIPDB 社群惡意情資與 Redis 快取防護 (`abuseIpDbService.ts`)
* **API 來源**：AbuseIPDB API v2 (`check` 端點，90 天惡意檢舉歷史)。
* **情報內容**：
  * `abuseConfidenceScore`：濫用信心指數 (0-100%)，代表社群檢舉之惡意可信度。
  * `totalReports`：被舉報總次數。
  * `usageType`：使用類型（例如 `Data Center/Web Hosting/Transit`、`Commercial` 等）。
  * `lastReportedAt`：最後被社群舉報時間。
* **Redis 快取與配額保護**：
  * **24 小時 TTL 快取**：鍵值格式 `abuseipdb:{ip}`，查詢時優先自 Redis 讀取，大幅節省每日 1,000 次之免費配額。
  * **批量查詢與配額上限 (`batchCheckAbuseDb`)**：
    * 透過 `redis.mget` 一次性批次取回已快取之 IP。
    * 對於快取未命中之 IP，提供預設 50 筆之外部查詢上限 (`abuseCheckLimit`)，超過者標記為 `not_checked` 保留額度。
    * 併發控制與平滑限流（每次最多 2 個同時請求，且批次間加入 200ms 間隔延遲），徹底避免觸發 AbuseIPDB 之 Rate Limit。
  * **高可用優雅降級**：若無 API Key 或遇到 HTTP 429 配額超額，自動回傳預設狀態而不中斷主流程。
* **單獨查詢端點** (`GET /upload/abuseipdb/check?ip=...`)：
  * 直接呼叫 `checkSingleIpAbuseDb`，僅回傳 AbuseIPDB 情報（不含 GeoLite2 / FireHOL / AI）。
  * Controller 先以 `net.isIP` 校驗格式，無效 IP 直接回 400，避免浪費外部 API 配額。

### 3.5 全方位安全情資聚合主引擎 (`securityIntelService.ts`)
* **核心定位**：
  * 作為全域資安整合主核心，將原本分散的 CSV 解析、GeoLite2 地理查詢、FireHOL 惡意名單二元搜尋與 AbuseIPDB 批次比對，整合成單一無縫的**單趟（Single-Pass）巨量串流管線**。
* **主要功能與端點**：
  * **單一 IP 綜合查詢** (`GET /upload/security-intel/check?ip=...`)：
    * 第一階段以 `Promise.all` 平行獲取在地情資：`checkSingleIpGeoLite`（地理/ASN/網段/組織）、`checkSingleIpFirehol`（L1/L2/Spamhaus 黑名單）與 `checkSingleIpAbuseDb`（社群檢舉歷史）。
    * 第二階段將上述整合情資全數遞交至 `analyzeIpWithAiAgent`，啟用 Google Search Grounding 即時連網查詢公開情報，回傳全方位深度 CTI 分析報告。
  * **CSV 巨量日誌安全情資分析** (`POST /upload/security-intel/csv`)：
    * **單趟高效串流處理**：透過 Node.js `readline` 逐行串流解析（支援純逗號與帶雙引號格式，自動跳過多語系標題列），同步完成 IP 計數、IPv4/IPv6 網段聚合（IPv4 `/24`、IPv6 `/64`）。
    * **在地高效情資直查**：串流過程中對每個相異 IP 直接調用已快取的 GeoLite2 MMDB 讀取器與 FireHOL 二進位/BigInt 二元搜尋，無任何外部 HTTP 阻塞。
    * **雙層排行與產業統計**：
      1. **Top 30 IP**：真實請求數最高的前 30 個 IP，附帶 ASN、國籍繁中、產業分類、FireHOL 命中狀態及高風險判定。
      2. **Top 30 聚合網段**：自動匯總各網段總請求量、涵蓋 IP 數及代表性 Sample IPs。
      3. **產業分類摘要**：依據 Hosting、ISP、CDN 等分類統計業者數、IP 數與請求總量。
    * **AbuseIPDB 智慧批次豐富**：僅針對請求量最高的前 30 筆（或包含詳細清單時前 100 筆）進行 Redis 快取讀取與平滑外部補查，極大化 API 配額效益。
    * **效能保護與詳細清單開關 (`includeDetail`)**：
      * 預設為 `false`，回傳 `detailList: []`，大幅縮減傳輸頻寬與 JSON 序列化開銷。
      * 當前端傳入 `includeDetail=true` 時，1,000 筆內完整輸出，超過 1,000 筆則取請求量最高之前 1,000 筆詳細資訊，兼顧深度分析與前端瀏覽器渲染效能。

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
│   │   ├── securityIntel/   # 🛡️ 資安情報分析模組
│   │   │   ├── types.ts                # 情資模組資料介面與型別定義
│   │   │   ├── providerClassifier.ts   # 雲端與產業角色分類庫
│   │   │   ├── geoLiteService.ts       # MaxMind MMDB 單例讀取器與單一 IP 查詢服務
│   │   │   ├── fireholService.ts       # FireHOL L1/L2 + Spamhaus 黑名單引擎
│   │   │   ├── abuseIpDbService.ts     # AbuseIPDB 威脅情資與 Redis 快取
│   │   │   ├── aiAgentService.ts       # Gemini 3 AI Agent 評估
│   │   │   ├── securityIntelService.ts # 全方位安全情資主引擎 (單一 IP 查詢與 CSV 巨量串流分析)
│   │   │   └── index.ts                # 模組統一匯出進入點 (Facade)
│   │   ├── articleService.ts
│   │   ├── helloService.ts
│   │   └── userService.ts
│   ├── utils/               # 共用輔助函式庫
│   │   ├── appError.ts          # 自訂業務錯誤
│   │   ├── catchAsync.ts        # 非同步異常捕捉
│   │   ├── crypto.ts            # RSA 解密工具
│   │   ├── fileUtils.ts         # CSV/檔案行解析、引號清理與標題過濾通用工具
│   │   └── ipUtils.ts           # IP 數值/BigInt 轉換、CIDR 解析、二元搜尋比對與繁中國別字典
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
