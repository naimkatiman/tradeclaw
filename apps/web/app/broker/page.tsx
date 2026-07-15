import { requireAdmin } from '../../lib/admin-gate';
import BrokerAccountClient from './BrokerAccountClient';

export default async function BrokerPage() {
  await requireAdmin();
  return <BrokerAccountClient />;
}
