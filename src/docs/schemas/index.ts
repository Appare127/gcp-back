import { userSchemas } from './user.schema';
import {
  schemas as articleSchemas,
  responses as articleResponses,
  requestBodies as articleRequestBodies
} from './article.schema';

export const allSchemas = {
  ...userSchemas,
  ...articleSchemas
};

export const allResponses = {
  ...articleResponses
};

export const allRequestBodies = {
  ...articleRequestBodies
};
