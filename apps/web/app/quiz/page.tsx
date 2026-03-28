import type { Metadata } from 'next';
import { QuizClient } from './QuizClient';

export const metadata: Metadata = {
  title: 'What Kind of Trader Are You? | TradeClaw',
  description: 'Take our 5-question quiz to discover your trading personality and get a personalized TradeClaw setup recommendation.',
  openGraph: {
    title: 'What Kind of Trader Are You? | TradeClaw',
    description: 'Discover your trading personality and get personalized signal recommendations.',
  },
};

export default function QuizPage() {
  return <QuizClient />;
}
