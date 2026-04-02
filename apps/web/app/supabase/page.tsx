import type { Metadata } from 'next';
import { SupabaseClient } from './SupabaseClient';

export const metadata: Metadata = {
  title: 'Supabase Setup | TradeClaw',
  description:
    'Upgrade TradeClaw from JSON files to Supabase (Postgres). One-command migration, persistent data, real multi-user support. Free tier included.',
  keywords: ['supabase', 'postgres', 'database', 'migration', 'self-hosted', 'tradeclaw', 'open source'],
  openGraph: {
    title: 'Scale TradeClaw with Supabase — Postgres in 5 Minutes',
    description: 'Migrate from JSON files to Supabase Postgres with one command. Persistent data, RLS, dashboard UI.',
    url: 'https://tradeclaw.win/supabase',
  },
  alternates: {
    canonical: 'https://tradeclaw.win/supabase',
  },
};

export default function SupabasePage() {
  return <SupabaseClient />;
}
