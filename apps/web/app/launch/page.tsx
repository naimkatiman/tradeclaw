import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'TradeClaw',
  robots: { index: false, follow: false },
};

export default function LaunchPage() {
  redirect('/');
}
