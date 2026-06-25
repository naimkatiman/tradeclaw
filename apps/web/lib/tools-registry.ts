import 'server-only';

import { query, queryOne } from './db-pool';

export interface Tool {
  id: string;
  name: string;
  category: string;
  description: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
}

interface ToolRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
}

function toTool(row: ToolRow): Tool {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    enabled: row.enabled,
    config: row.config ?? {},
    updatedAt: row.updated_at,
  };
}

export async function listTools(): Promise<Tool[]> {
  const rows = await query<ToolRow>(
    `SELECT id, name, category, description, enabled, config, updated_at::text
       FROM tool_registry
   ORDER BY category, name`,
  );
  return rows.map(toTool);
}

export async function getToolById(id: string): Promise<Tool | null> {
  const row = await queryOne<ToolRow>(
    `SELECT id, name, category, description, enabled, config, updated_at::text
       FROM tool_registry
      WHERE id = $1`,
    [id],
  );
  return row ? toTool(row) : null;
}

export async function toggleTool(id: string, enabled: boolean): Promise<Tool | null> {
  const row = await queryOne<ToolRow>(
    `UPDATE tool_registry
        SET enabled = $2, updated_at = NOW()
      WHERE id = $1
   RETURNING id, name, category, description, enabled, config, updated_at::text`,
    [id, enabled],
  );
  return row ? toTool(row) : null;
}

export async function updateToolConfig(
  id: string,
  config: Record<string, unknown>,
): Promise<Tool | null> {
  const row = await queryOne<ToolRow>(
    `UPDATE tool_registry
        SET config = $2::jsonb, updated_at = NOW()
      WHERE id = $1
   RETURNING id, name, category, description, enabled, config, updated_at::text`,
    [id, JSON.stringify(config)],
  );
  return row ? toTool(row) : null;
}
