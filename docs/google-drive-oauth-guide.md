# Google Drive OAuth 2.0 整合指南 (Node.js 版)

這份文件詳細記錄了如何讓 Node.js 後端安全地存取個人 Google Drive 空間（如 Google One 2TB/6TB 方案），並解決服務帳號 (Service Account) 無儲存空間的問題。

---

## 一、 GCP 後台初步設定

1. **啟用 API**：
   - 進入 [GCP 控制台](https://console.cloud.google.com/)。
   - 搜尋並啟用 **「Google Drive API」**。

2. **設定 OAuth 同意畫面 (Consent Screen)**：
   - 類型選 **「外部 (External)」**。
   - **測試使用者 (Test users)**：務必加入你自己的 Gmail 地址，否則會出現 `403 Access Denied`。
   - **發布狀態 (重要)**：
     - **測試中 (Testing)**：Refresh Token 的有效期只有 **7 天**。如果超過 7 天沒用，API 會報錯。
     - **生產環境 (In Production)**：點擊「發布應用程式」按鈕即可切換。在此狀態下 Refresh Token **永久有效**。即使 Google 提示需要驗證（因為使用了敏感權限），只要你是個人使用，不提交驗證資料也沒關係，重點是狀態要切換到「生產環境」。

3. **建立憑證 (Credentials)**：
   - 點擊「+ 建立憑證」 -> **「OAuth 用戶端 ID」**。
   - 應用程式類型：**「網頁應用程式」 (Web Application)**。
   - **已授權的重新導向 URI**：新增 `https://developers.google.com/oauthplayground`。
   - **取得並保存**：`Client ID` 與 `Client Secret`。

---

## 二、 換取 Refresh Token (通行證)

我們使用 Google 官方的 **OAuth 2.0 Playground** 來換取金鑰：

1. 開啟 [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)。
2. 點擊右上角 **齒輪 (Settings)**：
   - 勾選 `Use your own OAuth credentials`。
   - 填入你的 `Client ID` 和 `Client Secret`。
3. **Step 1: Select Scopes**：
   - 輸入 `https://www.googleapis.com/auth/drive` (完整讀寫權限)。
   - 點擊 **Authorize APIs** 並登入你的 Google 帳號。
4. **Step 2: Exchange code**：
   - 點擊 **Exchange authorization code for tokens**。
   - 複製產生的 **Refresh Token**。

---

## 三、 專案環境配置 (.env)

在專案根目錄的 `.env` 中加入以下資訊：

```env
DRIVE_CLIENT_ID=你的用戶端ID
DRIVE_CLIENT_SECRET=你的用戶端密鑰
DRIVE_REFRESH_TOKEN=剛才換取的Refresh_Token
```

---

## 四、 Node.js 核心實作

### 1. 初始化連線
```typescript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.DRIVE_CLIENT_ID,
  process.env.DRIVE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.DRIVE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });
```

### 2. 轉換圖片網址 (可用於 <img> 標籤)
Google Drive 的原始連結無法直接顯示，需轉換格式：
- **原始 ID**: `FILE_ID`
- **直接顯示連結**: `https://drive.google.com/uc?export=view&id=FILE_ID`

---

## 五、 常見錯誤排除 (Troubleshooting)

| 錯誤訊息 | 原因 | 解決方法 |
| :--- | :--- | :--- |
| `403 Access Denied` | 沒加測試使用者 | 在「OAuth 同意畫面」加入你的 Gmail。 |
| `invalid_scope` | Scope 格式不對 | 確保輸入完整的網址 `https://www.googleapis.com/auth/drive`。 |
| `Service Accounts do not have storage quota` | 用錯帳號類型 | 這是因為用了服務帳號，請改用 OAuth 2.0 流程。 |
| `invalid_request` | .env 沒讀到或格式錯 | 重啟伺服器並確認金鑰無多餘空格。 |
| `invalid_grant` | Token 已過期或被撤銷 | 通常是因為處於「測試模式」且超過 7 天沒用，請重新執行 OAuth Playground 流程。 |

---

## 六、 安全性提醒

1. **不要將金鑰上傳至 GitHub**：務必在 `.gitignore` 排除含有金鑰的檔案或環境變數。
2. **權限最小化**：如果只需上傳，建議 Scope 使用 `drive.file`；若需管理全硬碟，才用 `drive`。
