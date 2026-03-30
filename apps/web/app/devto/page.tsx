import { DevtoClient } from './DevtoClient';

export const metadata = {
  title: 'Dev.to Article — TradeClaw',
  description: 'Read our deep-dive article on building an open-source AI trading signal platform. Published on Dev.to.',
};

export default function DevtoPage() {
  return <DevtoClient />;
}
