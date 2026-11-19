import { google } from 'googleapis';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { AppError } from './utils/appError';

dotenv.config();

// 1. 設定 OAuth2 客戶端
const oauth2Client = new google.auth.OAuth2(
  process.env.DRIVE_CLIENT_ID,
  process.env.DRIVE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // 這是我們剛剛設定的轉址網址
);

// 2. 放入我們辛苦拿到的 Refresh Token
oauth2Client.setCredentials({
  refresh_token: process.env.DRIVE_REFRESH_TOKEN as string
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

/** 預設 Google Drive 目標資料夾 ID（從環境變數讀取） */
const defaultFolderId = process.env.DRIVE_FOLDER_ID || '';

/** Google Drive 檔案與資料夾 ID 合法格式正則（僅允許英數、底線與連字號，防止 Drive Query 注入） */
const DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * 驗證 Google Drive 檔案或資料夾 ID 格式是否安全合法
 */
function validateDriveId(id: string, label = '資料夾 ID'): void {
  if (!DRIVE_ID_REGEX.test(id)) {
    throw new AppError(`無效的 Google Drive ${label} 格式`, 400);
  }
}

/**
 * 上傳檔案至 Google Drive
 */
export const uploadToDrive = async (
  file: Express.Multer.File,
  folderId: string = defaultFolderId // 設定的哪個資料夾ID，可以選子資料夾
): Promise<string> => {
  if (folderId) {
    validateDriveId(folderId, '資料夾 ID');
  }
  const { originalname, buffer, mimetype } = file;

  const bufferStream = new Readable();
  bufferStream.push(buffer);
  bufferStream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: `${Date.now()}-${originalname}`,
      ...(folderId ? { parents: [folderId] } : {})
    },
    media: {
      mimeType: mimetype,
      body: bufferStream
    },
    fields: 'id, webViewLink'
  });

  // 修改權限：讓所有人都能透過連結看到這張圖 (這步很重要，不然網址只有你能看)
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  //   return response.data.webViewLink || '';
  //   https://drive.google.com/file/d/1dJXkGXlODEIi_gnVuuaJA9vgL86Kj_Fs/view?usp=drivesdk

  const fileId = response.data.id;
  // 這是 Google Drive 的直接顯示網址格式
  return `https://drive.google.com/uc?export=view&id=${fileId}`;

  //   這個是直接在雲端硬碟的圖片連結，是否包含圖片閱讀器的網頁
  //   https://drive.google.com/file/d/1dJXkGXlODEIi_gnVuuaJA9vgL86Kj_Fs/view?usp=drive_link
  //   可以把中間的圖片ID取出來，做成下面的格式，就是可以放在<img>裡的純圖片了
  //   https://drive.google.com/uc?export=view&id=1dJXkGXlODEIi_gnVuuaJA9vgL86Kj_Fs
};

/**
 * 查詢指定資料夾內的檔案清單
 */
export const listDriveFiles = async (folderId: string = defaultFolderId) => {
  if (folderId) {
    validateDriveId(folderId, '資料夾 ID');
  }
  const response = await drive.files.list({
    // q 代表 Query，這句的意思是：找出在某資料夾內且還沒被刪除的檔案
    q: folderId ? `'${folderId}' in parents and trashed = false` : 'trashed = false',
    // q: `trashed = false`,
    fields: 'files(id, name, webViewLink, mimeType, mimeType, thumbnailLink)',
    // orderBy: 'createdTime desc' // 按時間倒序排列（新的在前）
    orderBy: 'folder, name' // 讓資料夾排在最前面，然後按名稱排序
  });

  return response.data.files || [];
};

/**
 * 建立新資料夾
 */
export const createDriveFolder = async (
  folderName: string,
  parentId: string = defaultFolderId
) => {
  if (parentId) {
    validateDriveId(parentId, '父資料夾 ID');
  }
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {})
    },
    fields: 'id, name, webViewLink'
  });
  return response.data;
};

/**
 * 刪除檔案或資料夾
 */
export const deleteDriveFile = async (fileId: string) => {
  validateDriveId(fileId, '檔案 ID');
  // 注意：delete 是永久刪除。如果你想丟進垃圾桶，要改用 update 並設定 trashed: true
  await drive.files.delete({
    fileId: fileId
  });
  return true;
};
