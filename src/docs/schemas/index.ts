import {
  userSchemas as userSchemas,
  userResponses as userResponses,
  userRequestBodies as userRequestBodies
} from './user.schema';
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
  ...articleResponses,
  ...userResponses
};

export const allRequestBodies = {
  ...articleRequestBodies,
  ...userRequestBodies
};
