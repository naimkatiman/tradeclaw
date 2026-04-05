'use client';

import { useCallback, useRef, useEffect } from 'react';
import {
  CandlestickSeries,
  HistogramSeries,
  createTextWatermark,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import LWChart from './LWChart';
import { useChartTheme } from './use-chart-theme';
import type { OHLCVBar } from './types';

interface FullChartProps {
  symbol: string;
  bars: OHLCVBar[];
  latestBar?: OHLCVBar | null;
  height?: number;
  pip?: number;
}

export default function FullChart({ symbol, bars, latestBar, height = 600, pip = 0.01 }: FullChartProps) {
  const theme = useChartTheme();
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const initRef = useRef(false);

  const onChartReady = useCallback(
    (chart: IChartApi) => {
      // Reset refs on remount (strict mode)
      candleRef.current = null;
      volumeRef.current = null;
      initRef.current = false;

      // v5 watermark API
      createTextWatermark(chart.panes()[0], {
        lines: [
          {
            text: symbol,
            color: 'rgba(255,255,255,0.04)',
            fontSize: 48,
          },
        ],
      });

      const precision = Math.max(0, -Math.floor(Math.log10(pip)));
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: theme.upColor,
        downColor: theme.downColor,
        wickUpColor: theme.wickUpColor,
        wickDownColor: theme.wickDownColor,
        borderVisible: false,
        priceFormat: { type: 'price', precision, minMove: pip },
      });
      candleRef.current = candleSeries;

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeRef.current = volumeSeries;

      initRef.current = true;
    },
    // symbol used for watermark text at init; theme for initial series colors
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbol],
  );

  // Set/update bar data and theme colors
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volumeRef.current;
    if (!candle || !vol || !initRef.current) return;

    candle.applyOptions({
      upColor: theme.upColor,
      downColor: theme.downColor,
      wickUpColor: theme.wickUpColor,
      wickDownColor: theme.wickDownColor,
    });

    candle.setData(bars);
    vol.setData(
      bars.map((b) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= b.open ? theme.volumeUpColor : theme.volumeDownColor,
      })),
    );
  }, [bars, theme]);

  // Real-time updates
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
