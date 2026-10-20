/**
 * IP 與 ISP 分析相關的 Swagger / OpenAPI Schema 定義
 */
export const analysisSchemas = {
  /**
   * 分析概覽統計模型
   */
  IspOverviewModel: {
    type: 'object',
    description: 'IP 分析總覽統計指標',
    properties: {
      totalIpCount: {
        type: 'integer',
        description: '有效 IP 總數',
        example: 177734
      },
      totalSubnetCount: {
        type: 'integer',
        description: '不重複網段總數 (IPv4 /24 + IPv6 /64)',
        example: 54356
      },
      ipv4Count: {
        type: 'integer',
        description: 'IPv4 數量',
        example: 155839
      },
      ipv6Count: {
        type: 'integer',
        description: 'IPv6 數量',
        example: 21895
      },
      totalRequestCount: {
        type: 'integer',
        description: '總請求次數',
        example: 159498867
      },
      invalidCount: {
        type: 'integer',
        description: '無效或解析失敗的行數 (如標題列)',
        example: 0
      },
      highRiskCategoryCount: {
        type: 'integer',
        description: '高風險產業分類數量',
        example: 4
      },
      highRiskIpInTop30Count: {
        type: 'integer',
        description: '前 30 名巨量流量單一 IP 中屬於高風險 ISP 的數量',
        example: 15
      },
      highRiskSubnetInTop30Count: {
        type: 'integer',
        description: '前 30 名巨量流量網段中屬於高風險的數量',
        example: 12
      },
      durationMs: {
        type: 'integer',
        description: '伺服器分析耗時 (毫秒)',
        example: 420
      }
    }
  },

  /**
   * 產業分類統計項目模型
   */
  IspCategorySummaryItem: {
    type: 'object',
    description: '單一產業分類統計項目',
    properties: {
      category: {
        type: 'string',
        description: '產業角色類別名稱',
        example: '主機供應商'
      },
      isHighRisk: {
        type: 'boolean',
        description: '是否標記為高風險類別',
        example: true
      },
      ispCount: {
        type: 'integer',
        description: '該類別下涵蓋的不重複 ISP (ASN) 數量',
        example: 359
      },
      ipCount: {
        type: 'integer',
        description: '該類別下涵蓋的 IP 總數',
        example: 12687
      },
      totalRequests: {
        type: 'integer',
        description: '該類別產生的總請求次數',
        example: 12098891
      }
    }
  },

  /**
   * Top 30 巨量流量網段項目模型 (IPv4 /24 或 IPv6 /64)
   */
  IspTopSubnetItem: {
    type: 'object',
    description: '巨量流量聚合網段項目',
    properties: {
      rank: {
        type: 'integer',
        description: '請求量排名 (1-30)',
        example: 1
      },
      subnet: {
        type: 'string',
        description: '聚合網段 (IPv4 為 /24，IPv6 為 /64)',
        example: '113.185.44.0/24'
      },
      ipType: {
        type: 'string',
        description: 'IP 協定版本 (IPv4 或 IPv6)',
        example: 'IPv4'
      },
      ipCount: {
        type: 'integer',
        description: '該網段內涵蓋的不重複 IP 數量',
        example: 242
      },
      requests: {
        type: 'integer',
        description: '該網段產生的總請求次數',
        example: 263207
      },
      asn: {
        type: 'string',
        description: '自治系統編號 (ASN)',
        example: 'AS7552'
      },
      org: {
        type: 'string',
        description: '所屬組織或業者名稱',
        example: 'Viettel Group'
      },
      country: {
        type: 'string',
        description: '地理位置國家代碼與中文名稱 (例如 VN (越南))',
        example: 'VN (越南)'
      },
      category: {
        type: 'string',
        description: '所屬產業角色分類',
        example: '電信業者'
      },
      isHighRisk: {
        type: 'boolean',
        description: '是否為高風險網段',
        example: false
      },
      sampleIps: {
        type: 'array',
        description: '該網段下前幾顆範例 IP',
        items: { type: 'string' },
        example: ['113.185.44.1', '113.185.44.2', '113.185.44.3']
      }
    }
  },

  /**
   * Top 30 請求量最高 IP 項目模型
   */
  IspTopIpItem: {
    type: 'object',
    description: '巨量流量 Top IP 項目',
    properties: {
      rank: {
        type: 'integer',
        description: '請求量排名 (1-30)',
        example: 1
      },
      ip: {
        type: 'string',
        description: '客戶端 IP 位址',
        example: '18.166.97.91'
      },
      requests: {
        type: 'integer',
        description: '該 IP 產生的請求總量',
        example: 2732971
      },
      asn: {
        type: 'string',
        description: '自治系統編號 (ASN)',
        example: 'AS16509'
      },
      org: {
        type: 'string',
        description: '所屬組織或業者名稱',
        example: 'Amazon.com, Inc.'
      },
      country: {
        type: 'string',
        description: '地理位置國家代碼與中文名稱 (例如 HK (香港))',
        example: 'HK (香港)'
      },
      category: {
        type: 'string',
        description: '所屬產業角色分類',
        example: '主機供應商'
      },
      isHighRisk: {
        type: 'boolean',
        description: '是否為高風險 IP',
        example: true
      }
    }
  },

  /**
   * 詳細 IP 清單項目模型 (包含網段、業者、ASN、請求量等完整資訊)
   */
  IspDetailedIpItem: {
    type: 'object',
    description: '詳細 IP 清單項目',
    properties: {
      rank: {
        type: 'integer',
        description: '請求量排名',
        example: 1
      },
      ip: {
        type: 'string',
        description: '客戶端 IP 位址',
        example: '167.179.111.165'
      },
      country: {
        type: 'string',
        description: '地理位置國家代碼與中文名稱 (例如 JP (日本))',
        example: 'JP (日本)'
      },
      asn: {
        type: 'string',
        description: '自治系統編號 (ASN)',
        example: 'AS20473'
      },
      org: {
        type: 'string',
        description: '所屬組織或業者名稱',
        example: 'The Constant Company, LLC'
      },
      category: {
        type: 'string',
        description: '所屬產業角色分類',
        example: '主機供應商'
      },
      subnet: {
        type: 'string',
        description: '聚合網段 (IPv4 為 /24，IPv6 為 /64)',
        example: '167.179.111.0/24'
      },
      requests: {
        type: 'integer',
        description: '該 IP 產生的請求總量',
        example: 61
      },
      isHighRisk: {
        type: 'boolean',
        description: '是否為高風險 IP',
        example: true
      },
      ipType: {
        type: 'string',
        description: 'IP 協定版本 (IPv4 或 IPv6)',
        example: 'IPv4'
      }
    }
  },

  /**
   * ISP 分析核心結果模型 (雙層呈現：包含 top30Subnets 與 top30Ips)
   */
  ispResultModel: {
    type: 'object',
    description: 'GeoLite2 ISP 分析結果核心資料模型 (支援網段與單一 IP 雙層呈現)',
    properties: {
      overview: {
        $ref: '#/components/schemas/IspOverviewModel'
      },
      categorySummary: {
        type: 'array',
        description: '產業角色類別統計彙整',
        items: {
          $ref: '#/components/schemas/IspCategorySummaryItem'
        }
      },
      top30Subnets: {
        type: 'array',
        description: '請求量最高前 30 名聚合網段 (/24 與 /64)',
        items: {
          $ref: '#/components/schemas/IspTopSubnetItem'
        }
      },
      top30Ips: {
        type: 'array',
        description: '請求量最高前 30 名單一 IP 交叉分析結果',
        items: {
          $ref: '#/components/schemas/IspTopIpItem'
        }
      },
      detailList: {
        type: 'array',
        description: '詳細 IP 清單 (包含 IP、國家、ASN、業者、分類、聚合網段 CIDR、請求次數等)',
        items: {
          $ref: '#/components/schemas/IspDetailedIpItem'
        }
      }
    }
  },


  /**
   * 單一 IP GeoLite2 查詢資料核心模型
   */
  GeoLiteSingleIpCheckModel: {
    type: 'object',
    description: 'GeoLite2 單一 IP 查詢核心資料模型',
    properties: {
      ip: {
        type: 'string',
        description: '查詢的 IP 位址',
        example: '1.1.1.1'
      },
      isValid: {
        type: 'boolean',
        description: 'IP 格式是否合法有效',
        example: true
      },
      ipType: {
        type: 'string',
        description: 'IP 協定版本 (IPv4 或 IPv6)',
        example: 'IPv4'
      },
      asn: {
        type: 'object',
        description: '自治系統 (ASN) 相關資訊',
        properties: {
          asn: { type: 'string', example: 'AS13335' },
          autonomousSystemNumber: { type: 'integer', example: 13335 },
          org: { type: 'string', example: 'Cloudflare, Inc.' }
        }
      },
      geo: {
        type: 'object',
        description: '地理位置相關資訊',
        properties: {
          continent: { type: 'string', example: '大洋洲' },
          country: { type: 'string', example: 'AU' },
          countryName: { type: 'string', example: '澳大利亞' },
          city: { type: 'string', example: 'Unknown' },
          subdivision: { type: 'string', example: 'Unknown' },
          timeZone: { type: 'string', example: 'Australia/Sydney' },
          latitude: { type: 'number', example: -33.8688 },
          longitude: { type: 'number', example: 151.2093 }
        }
      },
      classification: {
        type: 'object',
        description: '產業角色與風險標籤',
        properties: {
          category: { type: 'string', example: 'CDN／內容傳遞服務商' },
          isHighRisk: { type: 'boolean', example: true }
        }
      },
      aiAssessment: {
        type: 'object',
        description: 'Gemini AI Agent 產出之資安與代理屬性深度評估',
        properties: {
          connectionType: {
            type: 'string',
            description: '連線類型判定 (例如 ISP (家用/寬頻) 或 Hosting / Datacenter)',
            example: 'ISP (家用/寬頻)'
          },
          riskAssessment: {
            type: 'string',
            description: '風險與代理屬性深度評估摘要',
            example: '此 IP 屬住宅寬頻環境，常被住宅代理池利用或遭殭屍網路控制'
          },
          riskLevel: {
            type: 'string',
            description: '風險等級判定 (高風險、中風險、低至中、低風險)',
            example: '低至中'
          },
          source: {
            type: 'string',
            description: '評估來源 (ai_agent 或 rule_fallback)',
            example: 'ai_agent'
          }
        }
      }
    }
  },

  /**
   * /upload/geolite/check 成功回應包裝模型
   */
  GeoLiteSingleIpCheckResponse: {
    type: 'object',
    description: 'GeoLite2 單一 IP 查詢成功回應結構',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'GeoLite2 單一 IP 查詢成功！'
      },
      data: {
        $ref: '#/components/schemas/GeoLiteSingleIpCheckModel'
      }
    }
  }
};

export const analysisResponses = {

  GeoLiteSingleIpCheckSuccess: {
    description: 'GeoLite2 單一 IP 查詢成功回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/GeoLiteSingleIpCheckResponse'
        }
      }
    }
  },


  FireholSingleIpCheckSuccess: {
    description: 'FireHOL 單一 IP 黑名單比對成功回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/FireholSingleIpCheckResponse'
        }
      }
    }
  },

  SecurityIntelAnalysisSuccess: {
    description: '全方位安全情報 CSV 分析成功回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/SecurityIntelAnalysisResponse'
        }
      }
    }
  },

  SecurityIntelSingleIpCheckSuccess: {
    description: '全方位安全情報單一 IP 查詢成功回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/SecurityIntelSingleIpCheckResponse'
        }
      }
    }
  },

  AbuseIpDbSingleIpCheckSuccess: {
    description: 'AbuseIPDB 單一 IP 查詢成功回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/AbuseIpDbSingleIpCheckResponse'
        }
      }
    }
  },

  AiAgentTestSuccess: {
    description: 'AI Agent 通訊測試成功回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/AiAgentTestResponse'
        }
      }
    }
  }
};

/**
 * FireHOL 黑名單分析相關的 Swagger / OpenAPI Schema 定義
 */
export const blacklistSchemas = {

  /**
   * FireHOL 單一 IP 查詢結果核心模型
   */
  FireholSingleIpCheckModel: {
    type: 'object',
    description: 'FireHOL 單一 IP 黑名單比對結果',
    properties: {
      ip: {
        type: 'string',
        description: '查詢之 IP 位址',
        example: '1.10.16.5'
      },
      isListed: {
        type: 'boolean',
        description: '是否命中黑名單 (true: 命中, false: 未命中/乾淨)',
        example: true
      },
      ipv4ListedLevel1: {
        type: 'boolean',
        description: '是否命中 FireHOL Level 1 嚴重黑名單 (IPv4)',
        example: true
      },
      ipv4ListedLevel2: {
        type: 'boolean',
        description: '是否命中 FireHOL Level 2 活躍攻擊黑名單 (IPv4)',
        example: false
      },
      ipv6SpamhausListed: {
        type: 'boolean',
        description: '是否命中 Spamhaus DROPv6 惡意黑名單 (IPv6)',
        example: false
      },
      lastUpdated: {
        type: 'string',
        format: 'date-time',
        description: '黑名單資料庫最後更新時間',
        example: '2026-10-19T09:44:42.000Z'
      },
      message: {
        type: 'string',
        description: '詳細判斷提示訊息',
        example: '⚠️ 該 IPv4 命中 FireHOL Level 1 嚴重惡意黑名單 (確認威脅)'
      }
    }
  },

  /**
   * /upload/firehol/check 成功回應包裝模型
   */
  FireholSingleIpCheckResponse: {
    type: 'object',
    description: 'FireHOL 單一 IP 查詢成功回應結構',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        $ref: '#/components/schemas/FireholSingleIpCheckModel'
      }
    }
  }
};

/**
 * 全方位安全威脅情報 (GeoLite2 + FireHOL + AbuseIPDB) 相關的 Swagger / OpenAPI Schema 定義
 */
export const securityIntelSchemas = {
  /**
   * 安全情報分析概覽統計模型
   */
  SecurityIntelOverviewModel: {
    type: 'object',
    description: '全方位安全威脅情報概覽統計指標',
    properties: {
      totalIpCount: { type: 'integer', example: 177734 },
      totalSubnetCount: { type: 'integer', example: 54356 },
      ipv4Count: { type: 'integer', example: 155839 },
      ipv6Count: { type: 'integer', example: 21895 },
      totalRequestCount: { type: 'integer', example: 159498867 },
      invalidCount: { type: 'integer', example: 0 },
      highRiskCategoryCount: { type: 'integer', example: 4 },
      highRiskIpInTop30Count: { type: 'integer', example: 15 },
      highRiskSubnetInTop30Count: { type: 'integer', example: 12 },
      fireholListedIpCount: { type: 'integer', description: '命中 FireHOL 或 Spamhaus 的 IP 總數', example: 42 },
      fireholL1Count: { type: 'integer', description: '命中 FireHOL Level 1 的 IP 數量', example: 25 },
      fireholL2Count: { type: 'integer', description: '命中 FireHOL Level 2 的 IP 數量', example: 15 },
      spamhausCount: { type: 'integer', description: '命中 Spamhaus DROPv6 的 IPv6 數量', example: 2 },
      abuseCheckedCount: { type: 'integer', description: '已取得 AbuseIPDB 情報之 IP 數量', example: 50 },
      durationMs: { type: 'integer', description: '分析耗時 (毫秒)', example: 480 }
    }
  },

  /**
   * 安全情報 Top 30 IP 模型
   */
  SecurityIntelTopIpItem: {
    type: 'object',
    description: '前 30 名巨量流量 IP 威脅狀態',
    properties: {
      rank: { type: 'integer', example: 1 },
      ip: { type: 'string', example: '118.25.6.39' },
      requests: { type: 'integer', example: 284501 },
      asn: { type: 'string', example: 'AS45090' },
      org: { type: 'string', example: 'Tencent Cloud' },
      country: { type: 'string', example: 'CN (中國)' },
      category: { type: 'string', example: '主機供應商' },
      fireholStatus: {
        type: 'string',
        enum: ['Level 1', 'Level 2', 'Spamhaus', 'Clean'],
        example: 'Clean'
      },
      isFireholListed: { type: 'boolean', example: false },
      abuseScore: { type: 'integer', nullable: true, example: 7 },
      isHighRisk: { type: 'boolean', example: true }
    }
  },

  /**
   * 整合詳細表格 IP 清單模型 (GeoLite2 + FireHOL + AbuseIPDB)
   */
  SecurityIntelDetailedIpItem: {
    type: 'object',
    description: '包含完整地理、黑名單與舉報分數之詳細 IP 項目',
    properties: {
      rank: { type: 'integer', example: 1 },
      ip: { type: 'string', example: '118.25.6.39' },
      country: { type: 'string', example: 'CN (中國)' },
      asn: { type: 'string', example: 'AS45090' },
      org: { type: 'string', example: 'Tencent Cloud Computing' },
      category: { type: 'string', example: '主機供應商' },
      subnet: { type: 'string', example: '118.25.6.0/24' },
      requests: { type: 'integer', example: 284501 },
      ipType: { type: 'string', enum: ['IPv4', 'IPv6'], example: 'IPv4' },
      fireholStatus: {
        type: 'string',
        enum: ['Level 1', 'Level 2', 'Spamhaus', 'Clean'],
        description: 'FireHOL 或 Spamhaus 命中狀態',
        example: 'Clean'
      },
      isFireholListed: { type: 'boolean', example: false },
      abuseScore: {
        type: 'integer',
        nullable: true,
        description: 'AbuseIPDB 信心惡意分數 (0-100)',
        example: 7
      },
      abuseReports: { type: 'integer', description: '被舉報總次數', example: 2 },
      abuseUsageType: { type: 'string', example: 'Data Center/Web Hosting/Transit' },
      abuseLastReportedAt: { type: 'string', nullable: true, example: '2026-09-17T22:17:21+00:00' },
      abuseStatus: {
        type: 'string',
        enum: ['cached', 'live', 'quota_exceeded', 'error', 'not_checked', 'key_missing'],
        example: 'live'
      },
      isHighRisk: { type: 'boolean', example: true }
    }
  },

  /**
   * 安全情報 CSV 分析回應模型
   */
  SecurityIntelAnalysisResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: '全方位安全威脅情報 CSV 分析完成！' },
      data: {
        type: 'object',
        properties: {
          overview: { $ref: '#/components/schemas/SecurityIntelOverviewModel' },
          categorySummary: {
            type: 'array',
            items: { $ref: '#/components/schemas/IspCategorySummaryItem' }
          },
          top30Subnets: {
            type: 'array',
            items: { $ref: '#/components/schemas/IspTopSubnetItem' }
          },
          top30Ips: {
            type: 'array',
            items: { $ref: '#/components/schemas/SecurityIntelTopIpItem' }
          },
          detailList: {
            type: 'array',
            description: '詳細 IP 清單 (包含 GeoLite2 + FireHOL + AbuseIPDB 狀態)',
            items: { $ref: '#/components/schemas/SecurityIntelDetailedIpItem' }
          }
        }
      }
    }
  },

  /**
   * 單一 IP 全方位威脅情報資料模型
   */
  SecurityIntelSingleIpCheckModel: {
    type: 'object',
    description: '單一 IP 全方位威脅情報資料模型',
    properties: {
      ip: { type: 'string', example: '118.25.6.39' },
      isValid: { type: 'boolean', example: true },
      ipType: { type: 'string', example: 'IPv4' },
      country: { type: 'string', example: 'CN (中國)' },
      countryName: { type: 'string', example: 'China' },
      city: { type: 'string', example: 'Beijing' },
      asn: { type: 'string', example: 'AS45090' },
      org: { type: 'string', example: 'Tencent Cloud Computing' },
      category: { type: 'string', example: '主機供應商' },
      subnet: {
        type: 'string',
        description: '聚合網段 (IPv4 為 /24，IPv6 為 /64)',
        example: '118.25.6.0/24'
      },
      firehol: { $ref: '#/components/schemas/FireholSingleIpCheckModel' },
      abuseIpDb: { $ref: '#/components/schemas/AbuseIpDbSingleIpCheckModel' },
      aiAssessment: { $ref: '#/components/schemas/AiSecurityAssessment' }
    }
  },

  /**
   * Gemini AI Agent 深度資安評估模型 (含 Google Search 網路即時情資)
   */
  AiSecurityAssessment: {
    type: 'object',
    description: 'Gemini AI Agent 深度評估 (結合已知情資與 Google Search 網路即時情資)',
    properties: {
      connectionType: {
        type: 'string',
        description: '連線屬性判定 (例如 Hosting / Datacenter、ISP (家用/寬頻) 等)',
        example: 'Hosting / Datacenter (雲端主機)'
      },
      riskLevel: {
        type: 'string',
        description: '風險等級判定 (例如 極高風險、高風險、中風險、低至中、低風險 等)',
        example: '高風險'
      },
      riskAssessment: {
        type: 'string',
        description: '專業資安分析評論 (詳細專業文字說明)',
        example: '該 IP 屬於機房與資料中心環境，且於公開威脅情資平台查得近期有異常掃描行為...'
      },
      onlineFindings: {
        type: 'string',
        description: 'Google 搜尋查得之公開威脅情報摘要',
        example: '查得該 IP 曾於社群情資平台被通報針對 Web 伺服器進行漏洞探測。'
      },
      recommendations: {
        type: 'string',
        description: '具體資安防禦或處置建議',
        example: '建議於邊界防火牆或 WAF 針對該 IP 實施嚴格速率限制或加強驗證。'
      },
      references: {
        type: 'array',
        description: 'Google Search 參考來源清單',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'AbuseIPDB IP Reports' },
            uri: { type: 'string', example: 'https://www.abuseipdb.com/check/118.25.6.39' }
          }
        }
      },
      source: {
        type: 'string',
        enum: ['ai_agent', 'rule_fallback'],
        description: '評估來源 (ai_agent: Gemini 3 Flash 模型推論、rule_fallback: 本機規則備援)',
        example: 'ai_agent'
      }
    }
  },

  /**
   * 單一 IP 全方位威脅情報回應模型
   */
  SecurityIntelSingleIpCheckResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: '全方位安全威脅情報查詢成功！' },
      data: { $ref: '#/components/schemas/SecurityIntelSingleIpCheckModel' }
    }
  },

  /**
   * AbuseIPDB 單一 IP 查詢資料模型
   */
  AbuseIpDbSingleIpCheckModel: {
    type: 'object',
    description: 'AbuseIPDB 單一 IP 社群惡意檢舉情報',
    properties: {
      ip: { type: 'string', example: '118.25.6.39' },
      abuseConfidenceScore: {
        type: 'integer',
        nullable: true,
        description: '濫用信心指數 (0-100)，未查詢成功時為 null',
        example: 7
      },
      totalReports: { type: 'integer', description: '90 天內被舉報總次數', example: 2 },
      usageType: { type: 'string', example: 'Data Center/Web Hosting/Transit' },
      lastReportedAt: { type: 'string', nullable: true, example: '2026-09-17T22:17:21+00:00' },
      isWhitelisted: { type: 'boolean', nullable: true, example: false },
      domain: { type: 'string', example: 'tencent.com' },
      isp: { type: 'string', example: 'Tencent Cloud Computing (Beijing) Co. Ltd' },
      status: {
        type: 'string',
        enum: ['cached', 'live', 'quota_exceeded', 'error', 'not_checked', 'key_missing'],
        description: '查詢狀態 (cached: Redis 快取、live: 即時 API、quota_exceeded: 配額超額、error: 查詢失敗、key_missing: 未設定 API Key)',
        example: 'live'
      }
    }
  },

  /**
   * /upload/abuseipdb/check 成功回應包裝模型
   */
  AbuseIpDbSingleIpCheckResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'AbuseIPDB 單一 IP 查詢成功！' },
      data: { $ref: '#/components/schemas/AbuseIpDbSingleIpCheckModel' }
    }
  },

  /**
   * AI Agent 測試溝通請求模型
   */
  AiAgentTestRequest: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: '測試提示詞或欲諮詢的問題 (未提供時將發送預設資安自我介紹與最新威脅查詢)',
        example: '請簡要自我介紹你的資安分析職責，並列出近期重大 CVE 漏洞。'
      },
      systemInstruction: {
        type: 'string',
        description: '系統指示指令 (System Instruction)',
        example: '你是一位頂尖的資安情資分析專家，請使用繁體中文專業回答。'
      },
      enableGoogleSearch: {
        type: 'boolean',
        description: '是否啟用 Google Search 即時聯網搜尋工具',
        example: true
      },
      model: {
        type: 'string',
        description: '指定 Gemini 模型名稱',
        example: 'gemini-3-flash-preview'
      }
    }
  },

  /**
   * AI Agent 測試溝通資料模型
   */
  AiAgentTestModel: {
    type: 'object',
    description: 'AI Agent 測試溝通結果',
    properties: {
      prompt: {
        type: 'string',
        description: '發送之提示詞',
        example: '請簡短自我介紹你的角色與職責。'
      },
      reply: {
        type: 'string',
        description: 'AI Agent 回應內容 (繁體中文)',
        example: '您好！我是專門負責資安威脅情報分析的 AI Agent...'
      },
      model: {
        type: 'string',
        description: '使用的 Gemini 模型',
        example: 'gemini-3-flash-preview'
      },
      googleSearchEnabled: {
        type: 'boolean',
        description: '是否啟用 Google Search 即時聯網搜尋',
        example: true
      },
      references: {
        type: 'array',
        description: 'Google Search 參考來源清單',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'National Vulnerability Database' },
            uri: { type: 'string', example: 'https://nvd.nist.gov' }
          }
        }
      },
      durationMs: {
        type: 'integer',
        description: '推論與檢索耗時 (毫秒)',
        example: 1250
      },
      note: {
        type: 'string',
        description: '系統降級或提醒提示 (例如 Google Search 工具配額超限時的降級說明)',
        example: '⚠️ 偵測到 Google Search 工具目前配額已用盡 (429 RESOURCE_EXHAUSTED)，已自動平滑降級為純模型推論模式。'
      },
      timestamp: {
        type: 'string',
        description: '回應時間 ISO 8601',
        example: '2026-10-20T08:00:00.000Z'
      }
    }
  },

  /**
   * AI Agent 測試溝通成功回應包裝模型
   */
  AiAgentTestResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'AI Agent 通訊測試成功！' },
      data: { $ref: '#/components/schemas/AiAgentTestModel' }
    }
  }
};

