import dotenv from 'dotenv';
// 引入環境變數，一定要放在最前面
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 伺服器已成功啟動在 http://localhost:${PORT}`);
});
