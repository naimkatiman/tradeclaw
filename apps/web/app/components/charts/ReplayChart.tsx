'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  HistogramSeries,
  LineStyle,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
} from 'lightweight-charts';
import LWChart from './LWChart';
import { useChartTheme } from './use-chart-theme';
import type { OHLCVBar } from './types';

interface ReplayChartProps {
  bars: OHLCVBar[];
  visibleCount: number;
  signal: {
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    tp1?: number;
    sl?: number;
  };
  height?: number;
  pip?: number;
}

export default function ReplayChart({ bars, visibleCount, signal, height = 400, pip = 0.01 }: ReplayChartProps) {
  const theme = useChartTheme();
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>[]>([]);

  const onChartReady = useCallback(
    (chart: IChartApi) => {
      // Clear stale refs from previous chart (strict mode remount)
      candleRef.current = null;
      volumeRef.current = null;
      markersRef.current = null;
      priceLinesRef.current = [];

      chartApiRef.current = chart;

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
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volumeRef.current = volumeSeries;

      markersRef.current = createSeriesMarkers(candleSeries);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Update price lines when signal or theme changes
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;

    // Remove old price lines
    for (const pl of priceLinesRef.current) {
      candle.removePriceLine(pl);
    }

    const newLines: ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>[] = [];

    if (signal.tp1) {
      newLines.push(candle.createPriceLine({
        price: signal.tp1,
        color: theme.upColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'TP',
      }));
    }
    if (signal.sl) {
      newLines.push(candle.createPriceLine({
        price: signal.sl,
        color: theme.downColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'SL',
      }));
    }
    newLines.push(candle.createPriceLine({
      price: signal.entryPrice,
      color: signal.direction === 'BUY' ? theme.upColor : theme.downColor,
      lineWidth: 1,
      lineStyle: LineStyle.LargeDashed,
      axisLabelVisible: true,
      title: 'Entry',
    }));

    priceLinesRef.current = newLines;

    // Update candlestick series colors
    candle.applyOptions({
      upColor: theme.upColor,
      downColor: theme.downColor,
      wickUpColor: theme.wickUpColor,
      wickDownColor: theme.wickDownColor,
    });
  }, [signal, theme]);

  // Update visible data and markers on each tick
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volumeRef.current;
    if (!candle || !vol) return;

    const safeCount = Math.max(0, Math.min(visibleCount, bars.length));
    const visible = bars.slice(0, safeCount);
    candle.setData(visible);
    vol.setData(
      visible.map((b) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= b.open ? theme.volumeUpColor : theme.volumeDownColor,
      })),
    );

    const signalBarIdx = Math.min(30, visible.length - 1);
    if (visibleCount > 30 && visible.length > 30 && visible[signalBarIdx] && markersRef.current) {
      markersRef.current.setMarkers([
        {
          time: visible[signalBarIdx].time,
          position: signal.direction === 'BUY' ? 'belowBar' : 'aboveBar',
          color: signal.direction === 'BUY' ? theme.upColor : theme.downColor,
          shape: signal.direction === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: signal.direction,
        },
      ]);
    }

    chartApiRef.current?.timeScale().scrollToPosition(2, false);
  }, [bars, visibleCount, signal, theme]);

  return <LWChart theme={theme} height={height} onChartReady={onChartReady} />;
}
