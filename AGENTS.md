# Project Rules

## Documentation Requirement
- **IMPORTANT**: Before performing any research, code edits, or tasks on this project, the agent MUST first read the backend project technical documentation at `docs/backend_project_tech_doc.md`.
- **Maintenance**: Whenever new technologies, major libraries, architectural plugins, or data models are introduced to the project, the agent MUST notify the user and update `docs/backend_project_tech_doc.md` accordingly (including updating the last updated date).
- **API Documentation**: Whenever API endpoints, request parameters, or response structures are added or modified, the agent MUST keep the OpenAPI / Swagger documentation updated in `src/docs/schemas/analysis.schema.ts` and route `@openapi` JSDoc annotations.

## General
- Follow the existing code style, naming conventions, and three-tier architecture (Routes ➔ Controllers ➔ Services).
- Use npm for running project commands (`npm run dev`, `npm run build`, `npm run lint`).
- Keep code in TypeScript with strict typing.
- Always prefer Function Declarations for core functions.
- Keep comments in Traditional Chinese (繁體中文).
- Avoid unnecessary over-engineering; prioritize readability and maintain existing logic.

## Stack
- **Framework**: Node.js + Express 5 (`express@5.2.1`)
- **Runtime & Build**: TypeScript 6.0 + `tsx` (`tsx watch`)
- **Database & ORM**: PostgreSQL + Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`)
- **Cache**: Redis (`ioredis`)
- **Cloud Storage**: Google Cloud Storage (`@google-cloud/storage`), Google Drive API OAuth 2.0 (`googleapis`)
- **AI & Security Intelligence**:
  - Google GenAI SDK (`@google/genai`, model: `gemini-3-flash-preview`)
  - MaxMind GeoLite2 (`maxmind`) for ASN & GeoIP lookup
  - FireHOL Level 1 & Level 2 Threat Intelligence (IPv4)
  - Spamhaus DROPv6 Threat Intelligence (IPv6)
- **API Documentation**: OpenAPI 3.0 / Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)
- **Security & Cryptography**: `bcryptjs`, `jsonwebtoken` (JWT), Node.js `crypto` (RSA Decryption)
