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
   * /upload/geolite/csv 成功回應包裝模型
   */
  GeoLiteAnalysisResponse: {
    type: 'object',
    description: 'GeoLite2 CSV 上傳分析成功回應結構',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'GeoLite2 CSV 分析完成！'
      },
      data: {
        $ref: '#/components/schemas/ispResultModel'
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
      },
      blacklist: {
        type: 'object',
        description: '線上威脅黑名單比對結果',
        properties: {
          isListed: { type: 'boolean', example: false },
          threatLevel: { type: 'string', example: 'Clean / Not Listed' },
          source: { type: 'string', example: 'FireHOL Level 1' }
        }
      },
      categorySummary: {
        type: 'array',
        description: '單一 IP 之產業分類統計 (相容批次表格)',
        items: {
          $ref: '#/components/schemas/IspCategorySummaryItem'
        }
      },
      top30Subnets: {
        type: 'array',
        description: '單一 IP 之網段項目 (相容批次表格)',
        items: {
          $ref: '#/components/schemas/IspTopSubnetItem'
        }
      },
      top30Ips: {
        type: 'array',
        description: '單一 IP 之 Top 項目 (相容批次表格)',
        items: {
          $ref: '#/components/schemas/IspTopIpItem'
        }
      },
      detailList: {
        type: 'array',
        description: '詳細 IP 清單 (相容批次表格)',
        items: {
          $ref: '#/components/schemas/IspDetailedIpItem'
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
  GeoLiteAnalysisSuccess: {
    description: 'GeoLite2 CSV 分析成功回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/GeoLiteAnalysisResponse'
        }
      }
    }
  },

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

  FireholAnalysisSuccess: {
    description: 'FireHOL CSV 黑名單分析成功回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/FireholAnalysisResponse'
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
   * FireHOL 分析概覽統計模型
   */
  FireholOverviewModel: {
    type: 'object',
    description: 'FireHOL 黑名單分析總覽統計',
    properties: {
      totalIpCount: {
        type: 'integer',
        description: '有效 IP 總數',
        example: 177734
      },
      ipv4Count: {
        type: 'integer',
        description: '有效 IPv4 數量 (比對 FireHOL)',
        example: 155839
      },
      ipv6Count: {
        type: 'integer',
        description: '有效 IPv6 數量 (比對 Spamhaus DROPv6)',
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
        example: 1
      },
      listedIpCount: {
        type: 'integer',
        description: '命中黑名單的 IP 總數',
        example: 38
      },
      listedRequestCount: {
        type: 'integer',
        description: '黑名單 IP 產生的請求總量',
        example: 84520
      },
      listedIpRatio: {
        type: 'string',
        description: '黑名單 IP 佔比百分比',
        example: '0.0214%'
      },
      listedRequestRatio: {
        type: 'string',
        description: '黑名單請求量佔比百分比',
        example: '0.0530%'
      },
      durationMs: {
        type: 'integer',
        description: '分析耗時 (毫秒)',
        example: 15
      },
      source: {
        type: 'string',
        description: '資料來源 (線上或本機備份)',
        example: 'FireHOL Level 1 (IPv4) + Spamhaus DROPv6 (IPv6)'
      },
      lastUpdated: {
        type: 'string',
        format: 'date-time',
        description: '黑名單資料庫最後更新時間',
        example: '2026-10-16T02:42:39.939Z'
      }
    }
  },

  /**
   * 命中黑名單的 IP 項目模型
   */
  FireholListedIpItem: {
    type: 'object',
    description: '命中黑名單的 IP 項目',
    properties: {
      ip: {
        type: 'string',
        description: '命中黑名單的 IP 位址',
        example: '1.10.16.5'
      },
      requests: {
        type: 'integer',
        description: '該 IP 產生的請求次數',
        example: 120
      },
      source: {
        type: 'string',
        description: '命中的黑名單來源 (FireHOL Level 1 或 Spamhaus DROPv6)',
        example: 'FireHOL Level 1'
      }
    }
  },

  /**
   * FireHOL 分析核心結果模型
   */
  FireholResultModel: {
    type: 'object',
    description: 'FireHOL CSV 分析核心結果模型',
    properties: {
      overview: {
        $ref: '#/components/schemas/FireholOverviewModel'
      },
      listedIps: {
        type: 'array',
        description: '命中黑名單的 IP 清單 (依請求量遞減排序)',
        items: {
          $ref: '#/components/schemas/FireholListedIpItem'
        }
      }
    }
  },

  /**
   * /upload/firehol/csv 成功回應包裝模型
   */
  FireholAnalysisResponse: {
    type: 'object',
    description: 'FireHOL CSV 上傳分析成功回應結構',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'FireHOL 黑名單比對完成！'
      },
      data: {
        $ref: '#/components/schemas/FireholResultModel'
      }
    }
  }
};

