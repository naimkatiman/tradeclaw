import { UsersClient } from './UsersClient';

export const metadata = {
  title: "Who's Using TradeClaw — Real Traders, Real Setups",
  description:
    'Meet the traders and developers using TradeClaw. Add yourself to the wall and tell the world how you use open-source AI trading signals.',
  openGraph: {
    title: "Who's Using TradeClaw?",
    description: 'Real traders and developers building with open-source AI signals.',
  },
};

export default function UsersPage() {
  return <UsersClient />;
}
