import { NotionClient } from './NotionClient';

export const metadata = {
  title: 'Notion Integration — TradeClaw',
  description: 'Export TradeClaw trading signals to your Notion database. Auto-sync with configurable filters, scheduled exports, and full signal data.',
};

export default function NotionPage() {
  return <NotionClient />;
}
