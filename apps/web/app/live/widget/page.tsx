import LiveWidgetEmbed from './LiveWidgetEmbed';

export const metadata = {
  title: 'TradeClaw Live Signal Ticker',
  robots: { index: false },
};

export default function LiveWidgetPage() {
  return <LiveWidgetEmbed />;
}
