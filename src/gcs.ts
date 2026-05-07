import { Storage } from '@google-cloud/storage';
import path from 'path';

// 初始化 Storage 客戶端
const storage = new Storage({
  keyFilename: path.join(process.cwd(), 'gcp-storage-image-key.json'), // 剛才下載的金鑰
  projectId: 'cobalt-badge-489015-u4' // 請從金鑰 JSON 檔中的 project_id 複製過來
});

const bucketName = 'geng-test-images-2026-05'; // 你在第一步建立的 Bucket 名稱
const bucket = storage.bucket(bucketName);

/**
 * 實作上傳功能
 */
export const uploadToGCS = (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { originalname, buffer, mimetype } = file;

    // 設定雲端檔名：加上時間戳記避免重複
    const gcsFileName = `images/${Date.now()}-${originalname}`;
    const blob = bucket.file(gcsFileName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: mimetype
      //   public: true // 讓這張圖可以被公開查看
    });

    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', () => {
      // 成功後回傳這張圖的公開網址
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
      resolve(publicUrl);
    });

    // 將檔案 buffer 寫入串流
    blobStream.end(buffer);
  });
};
