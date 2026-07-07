import { redirect } from 'next/navigation';

// TradeClaw no longer sells subscriptions. The route is kept so old links
// don't 404; the track record is the honest destination.
export default function PricingPage() {
  redirect('/track-record');
}
