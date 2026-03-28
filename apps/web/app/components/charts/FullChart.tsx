'use client';

import { useCallback, useRef, useEffect } from 'react';
import { type IChartApi, type ISeriesApi } from 'lightweight-charts';
import LWChart from './LWChart';
import { useChartTheme } from './use-chart-theme';
import type { OHLCVBar } from './types';

interface FullChartProps {
  symbol: string;
  bars: OHLCVBar[];
  latestBar?: OHLCVBar | null;
  height?: number;
}

export default function FullChart({ symbol, bars, latestBar, height = 600 }: FullChartProps) {
  const theme = useChartTheme();
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const initRef = useRef(false);

  const onChartReady = useCallback(
    (chart: IChartApi) => {
      chart.applyOptions({
        watermark: {
          visible: true,
          text: symbol,
          color: 'rgba(255,255,255,0.04)',
          fontSize: 48,
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: theme.upColor,
        downColor: theme.downColor,
        wickUpColor: theme.wickUpColor,
        wickDownColor: theme.wickDownColor,
        borderVisible: false,
      });
      candleRef.current = candleSeries;

      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeRef.current = volumeSeries;

      candleSeries.setData(bars);
      volumeSeries.setData(
        bars.map((b) => ({
          time: b.time,
          value: b.volume,
          color: b.close >= b.open ? theme.volumeUpColor : theme.volumeDownColor,
        })),
      );

      chart.timeScale().fitContent();
      initRef.current = true;
    },
    [bars, symbol, theme],
  );

  // Handle real-time updates
  useEffect(() => {
    if (!latestBar || !initRef.current) return;
    candleRef.current?.update(latestBar);
    volumeRef.current?.update({
      time: latestBar.time,
      value: latestBar.volume,
      color: latestBar.close >= latestBar.open ? theme.volumeUpColor : theme.volumeDownColor,
    });
  }, [latestBar, theme]);

  return <LWChart theme={theme} height={height} onChartReady={onChartReady} />;
}
