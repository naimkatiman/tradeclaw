'use client';

import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import type { ChartTheme } from './types';

const darkTheme: ChartTheme = {
  backgroundColor: '#050505',
  textColor: '#a1a1aa',
  gridColor: 'rgba(255,255,255,0.04)',
  upColor: '#10b981',
  downColor: '#f43f5e',
  wickUpColor: '#10b981',
  wickDownColor: '#f43f5e',
  volumeUpColor: 'rgba(16,185,129,0.3)',
  volumeDownColor: 'rgba(244,63,94,0.3)',
  crosshairColor: '#71717a',
};

const lightTheme: ChartTheme = {
  backgroundColor: '#ffffff',
  textColor: '#3f3f46',
  gridColor: 'rgba(0,0,0,0.06)',
  upColor: '#10b981',
  downColor: '#f43f5e',
  wickUpColor: '#10b981',
  wickDownColor: '#f43f5e',
  volumeUpColor: 'rgba(16,185,129,0.3)',
  volumeDownColor: 'rgba(244,63,94,0.3)',
  crosshairColor: '#a1a1aa',
};

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  return useMemo(
    () => (resolvedTheme === 'light' ? lightTheme : darkTheme),
    [resolvedTheme],
  );
}
