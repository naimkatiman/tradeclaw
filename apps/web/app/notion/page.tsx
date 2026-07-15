import { NotionClient } from './NotionClient';

export const metadata = {
  title: 'Notion Integration — TradeClaw',
  description: 'Configure a Notion export for TradeClaw signal-research fields. Preview rows are explicitly illustrative.',
};

export default function NotionPage() {
  return <NotionClient />;
}
