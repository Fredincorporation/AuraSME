import { openapiSpec } from '@/lib/openapi';

interface Operation {
  summary: string;
  requestBody?: { content: Record<string, unknown> };
  responses: Record<string, { description: string }>;
}

const spec = openapiSpec as unknown as {
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, Operation>>;
};

export default function ApiDocsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{spec.info.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {spec.info.description} v{spec.info.version}
        </p>
      </div>

      {Object.entries(spec.paths).map(([path, methods]) =>
        Object.entries(methods).map(([method, op]) => (
          <div key={`${method}-${path}`} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded text-caption font-bold uppercase ${
                  method === 'get' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-brand'
                }`}
              >
                {method}
              </span>
              <code className="text-sm font-semibold text-slate-900">{path}</code>
            </div>
            <p className="text-sm text-slate-600">{op.summary}</p>
            {op.requestBody && (
              <p className="text-xs text-slate-400">
                Content type: {Object.keys(op.requestBody.content).join(' · ')}
              </p>
            )}
            <p className="text-xs text-slate-400">
              Responses: {Object.entries(op.responses).map(([code, r]) => `${code} — ${r.description}`).join(' · ')}
            </p>
          </div>
        ))
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-1">
        <p className="font-bold text-slate-900">Integration contract</p>
        <p>
          Every endpoint is JSON over HTTPS with no manual rekeying.{' '}
          <code className="font-mono text-xs">POST /api/quotes</code> emits a Salesforce{' '}
          <code className="font-mono text-xs">Opportunity</code> PATCH payload (shown in the response) — swap the mock
          adapter for the live CRM by pointing <code className="font-mono text-xs">SF_INSTANCE_URL</code> and{' '}
          <code className="font-mono text-xs">SF_ACCESS_TOKEN</code> at the tenant.
        </p>
        <p>
          Machine-readable contract:{' '}
          <a href="/api/openapi.json" className="text-brand font-semibold underline">
            /api/openapi.json
          </a>
        </p>
      </div>
    </main>
  );
}
