export const schemas = {
  Article: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      content: { type: 'string' },
      authorId: { type: 'integer' }
    }
  },
  CreateArticleInput: {
    type: 'object',
    required: ['title'],
    properties: {
      title: {
        type: 'string',
        description: '這是文章的標題，長度建議在 5 到 50 字之間',
        minLength: 5,
        maxLength: 50
      }
    },
    example: {
      title: '這是範例標題'
    }
  }
};

export const responses = {
  CreatedArticle: {
    description: '成功建立文章的回應',
    content: {
      'application/json': {
        schema: {
          // #：代表「目前的這份 API 文件」。
          // /components：代表這份文件中的「組件區」（也就是我們在 swagger.ts 裡定義的 components 籃子）。
          // /schemas：代表組件區裡面的「資料結構」籃子。
          // /Article：代表在這個籃子裡，名字叫做 Article 的那個東西。
          $ref: '#/components/schemas/Article'
        }
      }
    }
  }
};

export const requestBodies = {
  CreateArticle: {
    required: true,
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/CreateArticleInput'
        }
      }
    }
  }
};
