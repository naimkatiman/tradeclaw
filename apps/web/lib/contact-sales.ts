import 'server-only';
import { query, queryOne, execute } from './db-pool';

export interface ContactSalesInquiry {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  telegram: string | null;
  company: string | null;
  useCase: string;
  budget: string | null;
  status: 'new' | 'contacted' | 'won' | 'lost';
  createdAt: Date;
}

export interface CreateInquiryInput {
  userId?: string | null;
  name: string;
  email: string;
  telegram?: string | null;
  company?: string | null;
  useCase: string;
  budget?: string | null;
}

interface Row {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  telegram: string | null;
  company: string | null;
  use_case: string;
  budget: string | null;
  status: string;
  created_at: string;
}

function toInquiry(row: Row): ContactSalesInquiry {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    telegram: row.telegram,
    company: row.company,
    useCase: row.use_case,
    budget: row.budget,
    status: row.status as ContactSalesInquiry['status'],
    createdAt: new Date(row.created_at),
  };
}

export async function createContactSalesInquiry(
  input: CreateInquiryInput,
): Promise<ContactSalesInquiry> {
  const row = await queryOne<Row>(
    `INSERT INTO contact_sales_inquiries
       (user_id, name, email, telegram, company, use_case, budget)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, name, email, telegram, company, use_case, budget,
               status, created_at`,
    [
      input.userId ?? null,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.telegram?.trim() || null,
      input.company?.trim() || null,
      input.useCase.trim(),
      input.budget?.trim() || null,
    ],
  );
  if (!row) throw new Error('createContactSalesInquiry: insert returned no row');
  return toInquiry(row);
}

export async function listContactSalesInquiries(
  status?: ContactSalesInquiry['status'],
): Promise<ContactSalesInquiry[]> {
  const rows = status
    ? await query<Row>(
        `SELECT id, user_id, name, email, telegram, company, use_case, budget,
                status, created_at
         FROM contact_sales_inquiries WHERE status = $1
         ORDER BY created_at DESC LIMIT 500`,
        [status],
      )
    : await query<Row>(
        `SELECT id, user_id, name, email, telegram, company, use_case, budget,
                status, created_at
         FROM contact_sales_inquiries
         ORDER BY created_at DESC LIMIT 500`,
      );
  return rows.map(toInquiry);
}

export async function updateInquiryStatus(
  id: string,
  status: ContactSalesInquiry['status'],
): Promise<void> {
  await execute(
    `UPDATE contact_sales_inquiries
     SET status = $1, updated_at = NOW()
     WHERE id = $2`,
    [status, id],
  );
}
