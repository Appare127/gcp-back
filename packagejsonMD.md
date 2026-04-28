# 開發環境指令說明

在 `package.json` 中，我們的開發指令如下：
`"dev": "ts-node-dev -r tsconfig-paths/register --respawn --transpile-only src/server.ts"`

以下是各個參數的詳細說明：

### 1. `-r tsconfig-paths/register`
*   **作用**：解決路徑別名（Path Alias）問題。
*   **原因**：`tsconfig.json` 中的 `paths`（如 `@/*`）僅供開發工具（VS Code）參考。Node.js 執行時並不認識 `@/`。
*   **運作方式**：`-r` 代表 `require`。這會在啟動程式前先載入 `tsconfig-paths`，它會攔截模組載入請求，並根據 `tsconfig.json` 的設定將 `@/` 轉換回正確的相對路徑。

### 2. `--respawn`
*   **作用**：自動重啟伺服器。
*   **運作方式**：持續監控專案檔案。當你修改程式碼並存檔時，它會自動重啟 worker 行程，讓你不需要手動重啟終端機。

### 3. `--transpile-only`
*   **作用**：加速啟動與重啟。
*   **運作方式**：跳過 TypeScript 的「型別檢查（Type Checking）」，只進行「轉譯（Transpilation，將 TS 轉為 JS）」。這在開發階段可以省下大量等待時間。

### 4. `src/server.ts`
*   **作用**：指定程式入口。
*   **運作方式**：告訴 `ts-node-dev` 整個應用程式要從哪一個檔案開始執行。
