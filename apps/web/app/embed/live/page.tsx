import { Metadata } from 'next';
import LiveActivityWidget from '../../../components/live-activity-widget';

export const metadata: Metadata = {
  title: 'TradeClaw Live Feed Widget',
  description: 'Compact live signal feed widget for embedding on external sites.',
};

export default function EmbedLivePage() {
  return (
    <div className="bg-black w-full max-w-[400px] h-[120px] mx-auto">
      <LiveActivityWidget
        apiUrl="/api/live-feed"
        refreshInterval={30000}
        height={120}
        showBranding
      />
    </div>
  );
}
