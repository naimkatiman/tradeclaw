'use client';

import { useState, useEffect } from 'react';
import { PageNavBar } from '../../components/PageNavBar';

interface Parameter {
  name: string;
  in: string;
  schema?: { type: string; enum?: string[]; minimum?: number; maximum?: number };
  description?: string;
  required?: boolean;
}

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description: string;
  parameters?: Parameter[];
  responses: Record<string, { description: string; content?: Record<string, unknown> }>;
}

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: { url: string; description: string }[];
  paths: Record<string, Record<string, {
    summary: string;
    description: string;
    parameters?: Parameter[];
    responses: Record<string, { description: string; content?: Record<string, unknown> }>;
  }>>;
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [baseUrl] = useState(() => typeof window !== 'undefined' ? window.location.origin : '');

  useEffect(() => {
    fetch('/api/docs')
      .then(r => r.json())
      .then(setSpec)
      .catch(() => setSpec(null));
  }, []);

  const endpoints: Endpoint[] = spec
    ? Object.entries(spec.paths).flatMap(([path, methods]) =>
        Object.entries(methods).map(([method, details]) => ({
          method: method.toUpperCase(),
          path,
          ...details,
        }))
      )
    : [];

  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-600',
    POST: 'bg-blue-600',
    PUT: 'bg-amber-600',
    DELETE: 'bg-red-600',
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <PageNavBar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
        {spec && (
          <p className="text-zinc-400 mb-8">
            {spec.info.description} — v{spec.info.version}
          </p>
        )}

        {/* Server selector */}
        {spec && (
          <div className="mb-8 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <label className="block text-sm text-zinc-400 mb-2">Base URL</label>
            <select
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              {spec.servers.map(s => (
                <option key={s.url} value={s.url}>
                  {s.url} ({s.description})
                </option>
              ))}
              <option value={typeof window !== 'undefined' ? window.location.origin : ''}>
                Current origin
              </option>
            </select>
          </div>
        )}

        {/* Endpoints */}
        <div className="space-y-4">
          {endpoints.map(ep => {
            const key = `${ep.method}-${ep.path}`;
            const isOpen = expanded === key;
            return (
              <div
                key={key}
                className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/50 transition"
                >
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded ${methodColors[ep.method] || 'bg-zinc-600'}`}
                  >
                    {ep.method}
                  </span>
                  <code className="text-sm text-zinc-300 flex-1 text-left">{ep.path}</code>
                  <span className="text-zinc-500 text-sm">{ep.summary}</span>
                  <span className="text-zinc-600">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-4 py-4 border-t border-zinc-800 space-y-4">
                    <p className="text-sm text-zinc-400">{ep.description}</p>

                    {ep.parameters && ep.parameters.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                          Parameters
                        </h4>
                        <div className="space-y-2">
                          {ep.parameters.map(p => (
                            <div
                              key={p.name}
                              className="flex items-start gap-3 text-sm bg-zinc-800/50 rounded px-3 py-2"
                            >
                              <code className="text-emerald-400">{p.name}</code>
                              <span className="text-zinc-500">({p.in})</span>
                              {p.required && (
                                <span className="text-red-400 text-xs">required</span>
                              )}
                              <span className="text-zinc-400 flex-1">{p.description}</span>
                              {p.schema?.enum && (
                                <span className="text-xs text-zinc-500">
                                  [{p.schema.enum.join(', ')}]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* cURL example */}
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                        Example
                      </h4>
                      <pre className="bg-zinc-950 rounded p-3 text-xs overflow-x-auto">
                        <code className="text-zinc-300">
                          curl -X {ep.method} &quot;{baseUrl}{ep.path}&quot;
                        </code>
                      </pre>
                    </div>

                    {/* Responses */}
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                        Responses
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(ep.responses).map(([code, resp]) => (
                          <div key={code} className="flex gap-3 text-sm">
                            <span
                              className={`font-mono ${code.startsWith('2') ? 'text-emerald-400' : 'text-red-400'}`}
                            >
                              {code}
                            </span>
                            <span className="text-zinc-400">{resp.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!spec && (
          <div className="text-center py-12 text-zinc-500">Loading API specification...</div>
        )}
      </main>
    </div>
  );
}
