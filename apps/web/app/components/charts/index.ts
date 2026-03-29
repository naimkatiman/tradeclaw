import dynamic from 'next/dynamic';

export const SignalChart = dynamic(() => import('./SignalChart'), { ssr: false });
export const SparklineChart = dynamic(() => import('./SparklineChart'), { ssr: false });
export const ReplayChart = dynamic(() => import('./ReplayChart'), { ssr: false });
export const FullChart = dynamic(() => import('./FullChart'), { ssr: false });
