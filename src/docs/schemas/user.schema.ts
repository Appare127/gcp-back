export const userSchemas = {
  UserModel: {
    type: 'object',
    properties: {
      // id: { type: 'integer' },
      account: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },
  RegisterUserInput: {
    type: 'object',
    required: ['account', 'password', 'email', 'birthday', 'phone'],
    properties: {
      account: {
        type: 'string',
        description: '用戶帳號，長度建議在 6 到 12 碼之間',
        minLength: 6,
        maxLength: 12
      },
      password: {
        type: 'string',
        description:
          '用戶密碼，長度建議在 8 到 16 碼之間，需包含英文大小寫與數字',
        minLength: 8,
        maxLength: 16
      },
      email: {
        type: 'string',
        description: '用戶電子郵件',
        format: 'email'
      },
      birthday: {
        type: 'string',
        description: '用戶生日，格式為 YYYY-MM-DD',
        format: 'date'
      },
      phone: {
        type: 'string',
        description: '用戶電話，長度建議在 10 碼左右',
        minLength: 10,
        maxLength: 10
      }
    },
    example: {
      account: 'test1234',
      password: 'Password123',
      email: 'test1234@test.com',
      birthday: '1990-01-01',
      phone: '0912345678'
    }
  },

  CreatedUser: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      account: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },

  LoginUserInput: {
    type: 'object',
    required: ['account', 'password'],
    properties: {
      account: {
        type: 'string',
        description: '用戶帳號',
        example: 'test1234'
      },
      password: {
        type: 'string',
        description: '用戶密碼',
        example: 'Password123'
      }
    }
  },

  LoginSuccess: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: '登入成功!' },
      token: { type: 'string', description: 'JWT 通行證' },
      user: {
        $ref: '#/components/schemas/UserModel'
      }
    }
  }
};

export const userResponses = {
  CreatedUser: {
    description: '成功建立帳號的回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/CreatedUser'
        }
      }
    }
  },

  LoginSuccess: {
    description: '登入成功的回應',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/LoginSuccess'
        }
      }
    }
  }
};

export const userRequestBodies = {
  RegisterUserInput: {
    description: '註冊帳號需要的資料',
    required: true,
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/RegisterUserInput'
        }
      }
    }
  },

  LoginUserInput: {
    description: '登入所需的帳號與密碼',
    required: true,
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/LoginUserInput'
        }
      }
    }
  }
};
