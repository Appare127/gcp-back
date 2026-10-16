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
import {
  analysisSchemas,
  blacklistSchemas,
  analysisResponses
} from './analysis.schema';

export const allSchemas = {
  ...userSchemas,
  ...articleSchemas,
  ...analysisSchemas,
  ...blacklistSchemas
};

export const allResponses = {
  ...articleResponses,
  ...userResponses,
  ...analysisResponses
};

export const allRequestBodies = {
  ...articleRequestBodies,
  ...userRequestBodies
};

