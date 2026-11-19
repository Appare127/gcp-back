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
  securityIntelSchemas,
  analysisResponses
} from './analysis.schema';
import { resumeSchemas, resumeResponses } from './resume.schema';
import { healthSchemas, healthResponses } from './health.schema';

export const allSchemas = {
  ...userSchemas,
  ...articleSchemas,
  ...analysisSchemas,
  ...blacklistSchemas,
  ...securityIntelSchemas,
  ...resumeSchemas,
  ...healthSchemas
};

export const allResponses = {
  ...articleResponses,
  ...userResponses,
  ...analysisResponses,
  ...resumeResponses,
  ...healthResponses
};

export const allRequestBodies = {
  ...articleRequestBodies,
  ...userRequestBodies
};

