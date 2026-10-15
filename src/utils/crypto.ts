import crypto from 'crypto';

/**
 * 使用 RSA 私鑰解密字串
 * @param encryptedData 前端傳送的 Base64 編碼加密密碼
 * @returns 解密後的明文字串
 */
export function decryptWithRsa(encryptedData: string): string {
  const privateKey = process.env.RSA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('環境變數 RSA_PRIVATE_KEY 未設定');
  }

  // 將環境變數中的 \n 字串轉換為真實換行符號
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
  const buffer = Buffer.from(encryptedData, 'base64');

  try {
    // 優先使用 Web 前端最常見的 RSA_PKCS1_PADDING (如 JSEncrypt)
    return crypto
      .privateDecrypt(
        {
          key: formattedPrivateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING
        },
        buffer
      )
      .toString('utf8');
  } catch (error) {
    // 若 PKCS#1 失敗，則嘗試使用 RSA_PKCS1_OAEP_PADDING
    return crypto
      .privateDecrypt(
        {
          key: formattedPrivateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        buffer
      )
      .toString('utf8');
  }
}
