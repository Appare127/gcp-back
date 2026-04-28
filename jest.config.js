const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
    // 這裡我們直接指定針對 .ts 檔案的設定，並加入 diagnostics 忽略
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: {
          ignoreCodes: [5107] // 忽略「node10 已過時」的警告
        }
      }
    ]
  }
};
