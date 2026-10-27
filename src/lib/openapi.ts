export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AuraSME Quote Engine API',
    version: '0.1.0',
    description: 'API-first census-to-quote service for UAE SME group health insurance.',
  },
  components: {
    securitySchemes: {
      bearerHttp: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access token. Required when the deployment is configured (auth enforced); omitted only in the open demo.',
      },
    },
    responses: {
      Unauthorized: { description: 'Missing or invalid bearer token (auth-enforced deployments).' },
      TooManyRequests: { description: 'Rate limit exceeded; retry after the Retry-After delay.' },
    },
  },
  paths: {
    '/api/health': {
      get: { summary: 'Service health, capability and endpoint list', responses: { '200': { description: 'OK' } } },
    },
    '/api/governance': {
      get: {
        summary: 'Data-residency, privacy and CBUAE disclosure controls derived from the live configuration',
        description: 'Public like /api/health. Reports what this deployment actually does with PII (secrets scope, LLM disclosure, storage residency, consent) — verifiable controls, not badges.',
        responses: { '200': { description: 'Governance report' } },
      },
    },
    '/api/metrics': {
      get: {
        summary: 'Quote funnel, conversion rate and median turnaround from the persisted quote ledger',
        security: [{ bearerHttp: [] }],
        responses: {
          '200': { description: 'Stage counts, conversion rate, observed quotes, backend' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/documents': {
      post: {
        summary: 'Bulk-ingest supporting documents (filename/MIME classification, member matching, completeness register)',
        description: 'Honest ingest: no OCR or content reads. Classifies by file name/MIME, links to census members by Emirates ID or name token, and returns a per-life document completeness queue.',
        security: [{ bearerHttp: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, size: { type: 'number' }, type: { type: 'string' } } } },
                  members: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Linked documents, completeness queue, unmatched count' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/integrations/contracts': {
      get: {
        summary: 'Contract-first descriptors for every outbound integration seam (Salesforce, payments, rating platform, policy admin)',
        description: 'Reports each seam method, endpoint, auth scheme, required env vars, request field shape and whether credentials are present. Never returns secrets.',
        security: [{ bearerHttp: [] }],
        responses: {
          '200': { description: 'Array of integration contracts' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/quotes/status': {
      post: {
        summary: 'Advance a quote through the funnel (review | ready | underwriting | bound | declined); on bind it issues the policy, collects payment and syncs CRM',
        security: [{ bearerHttp: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quoteNumber', 'status'],
                properties: {
                  quoteNumber: { type: 'string' },
                  status: { type: 'string', enum: ['draft', 'review', 'ready', 'underwriting', 'bound', 'declined'] },
                  policyNumber: { type: 'string' },
                  amountAED: { type: 'number' },
                  lives: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated status with policy-admin, payment and Salesforce adapter results' },
          '400': { description: 'Missing quoteNumber or status' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/session': {
      get: {
        summary: "Restore the signed-in broker's durable workspace snapshot and audit trail",
        description: 'Per-broker resumable session (company, census, plan config, documents, version history). Keyed to the verified bearer identity, never the request body. Survives cache clear, device switch and a different browser. The open demo (no auth) returns an empty snapshot and the session stays tab-scoped.',
        security: [{ bearerHttp: [] }],
        responses: {
          '200': { description: 'Snapshot, audit entries, last-updated time, persistence backend' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
      post: {
        summary: 'Persist the broker workspace snapshot and append to its audit trail',
        description: 'Last-writer-wins upsert of the workspace by user id; audit append is idempotent on (user_id, at) so replaying the browser tail never duplicates rows.',
        security: [{ bearerHttp: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['snapshot'],
                properties: {
                  snapshot: { type: 'object', description: 'WorkspaceSnapshot: company, census, activeConfig, documents, versions, etc.' },
                  audit: { type: 'array', items: { type: 'object' }, description: 'Optional AuditEntry[] to append' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Persistence result, audit rows written, server syncedAt' },
          '400': { description: 'Missing snapshot' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/census/parse': {
      post: {
        summary: 'Parse and validate an SME census workbook',
        security: [{ bearerHttp: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
            },
          },
        },
        responses: {
          '200': { description: 'Parsed members with mapped columns, issues and provenance' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '422': { description: 'Unreadable workbook' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/rating': {
      post: {
        summary: 'Rate a census against a plan configuration with compliance auto-correction',
        security: [{ bearerHttp: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { members: { type: 'array', items: { type: 'object' } }, config: { type: 'object' } } },
            },
          },
        },
        responses: {
          '200': { description: 'Per-life rating breakdown, VAT, policy fee, compliance report' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/budget': {
      post: {
        summary: 'Search the plan grid for configurations that price within a budget target',
        description:
          'Prices every candidate through the same compliance and rating engines as /api/rating, then ranks the plans that fit the target by a published coverage index.',
        security: [{ bearerHttp: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['members', 'config', 'basis', 'targetAED'],
                properties: {
                  members: { type: 'array', items: { type: 'object' } },
                  config: { type: 'object' },
                  basis: { type: 'string', enum: ['monthlyTotal', 'perEmployeeMonth', 'annualTotal'] },
                  targetAED: { type: 'number', minimum: 1 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Ranked options, the plans that fit, and the shortfall when none do' },
          '400': { description: 'Missing or malformed body fields' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '413': { description: 'Census above the supported row ceiling' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/quotes': {
      get: {
        summary: 'List persisted quote versions',
        security: [{ bearerHttp: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
      post: {
        summary: 'Upsert a quote (company + version snapshot) into the ledger and emit the Salesforce Opportunity payload',
        security: [{ bearerHttp: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['version'],
                properties: {
                  version: { type: 'object' },
                  company: { type: 'object' },
                  status: { type: 'string', enum: ['draft', 'review', 'ready', 'underwriting', 'bound', 'declined'] },
                  quoteNumber: { type: 'string', description: 'Optional; derived deterministically from trade licence when omitted' },
                  ratedLives: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Saved with quote number, funnel status, persistence backend and Salesforce opportunity payload' },
          '400': { description: 'Missing version' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/copilot': {
      post: {
        summary: 'Census copilot — LLM when GROQ_API_KEY is configured, deterministic rule engine otherwise',
        description: 'Answers census questions and runs budget-target plan search from chat. Pass config (the live PlanBenefitConfig) to enable the "quote me under 40k" intent.',
        security: [{ bearerHttp: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { message: { type: 'string' }, members: { type: 'array', items: { type: 'object' } }, config: { type: 'object' } } },
            },
          },
        },
        responses: {
          '200': { description: 'Reply plus structured issue analysis' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
  },
};
