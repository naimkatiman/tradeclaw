import type { Metadata } from 'next';
import { AdminLoginClient } from './AdminLoginClient';

export const metadata: Metadata = {
  title: 'Admin Login | TradeClaw',
  description: 'Authenticate to access admin features.',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
