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
  type LineWidth,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import LWChart from './LWChart';
import { useChartTheme } from './use-chart-theme';
import type { OHLCVBar, PriceLineData } from './types';

interface SignalChartProps {
  bars: OHLCVBar[];
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  /** Null when the tier mask has stripped this level (free tier). Undefined when unset. */
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  signalTime?: UTCTimestamp;
  height?: number;
  /** pip size for price formatting (e.g. 0.0001 for forex, 0.01 for gold/crypto) */
  pip?: number;
}

export default function SignalChart({
  bars,
  direction,
  entry,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  signalTime,
  height = 400,
  pip = 0.01,
}: SignalChartProps) {
  const theme = useChartTheme();
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>[]>([]);

  const onChartReady = useCallback(
    (chart: IChartApi) => {
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
    // Re-init when pip changes (different symbol)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pip],
  );

  // Update data, price lines, markers, and colors when props or theme change
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volumeRef.current;
    if (!candle || !vol) return;

    // Update series colors
    candle.applyOptions({
      upColor: theme.upColor,
      downColor: theme.downColor,
      wickUpColor: theme.wickUpColor,
      wickDownColor: theme.wickDownColor,
    });

    // Set data
    candle.setData(bars);
    vol.setData(
      bars.map((b) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= b.open ? theme.volumeUpColor : theme.volumeDownColor,
      })),
    );

    // Remove old price lines and create new ones
    for (const pl of priceLinesRef.current) {
      candle.removePriceLine(pl);
    }
    const lines: PriceLineData[] = [
      { price: entry, color: '#ffffff', title: 'Entry', lineStyle: LineStyle.Dashed, lineWidth: 1 },
      { price: stopLoss, color: theme.downColor, title: 'SL', lineStyle: LineStyle.Dashed, lineWidth: 1 },
      { price: takeProfit1, color: theme.upColor, title: 'TP1', lineStyle: LineStyle.Dashed, lineWidth: 1 },
    ];
    if (takeProfit2) lines.push({ price: takeProfit2, color: theme.upColor, title: 'TP2', lineStyle: LineStyle.Dotted, lineWidth: 1 });
    if (takeProfit3) lines.push({ price: takeProfit3, color: theme.upColor, title: 'TP3', lineStyle: LineStyle.Dotted, lineWidth: 1 });

    priceLinesRef.current = lines.map((l) =>
      candle.createPriceLine({
        price: l.price,
        color: l.color,
        lineWidth: l.lineWidth ?? (1 as LineWidth),
        lineStyle: l.lineStyle ?? LineStyle.Dashed,
        axisLabelVisible: true,
        title: l.title,
      }),
    );

    // Signal marker
    const markerTime = signalTime ?? bars[Math.min(30, bars.length - 1)]?.time;
    if (markerTime && markersRef.current) {
      markersRef.current.setMarkers([
        {
          time: markerTime,
          position: direction === 'BUY' ? 'belowBar' : 'aboveBar',
          color: direction === 'BUY' ? theme.upColor : theme.downColor,
          shape: direction === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: direction,
        },
      ]);
    }

    chartApiRef.current?.timeScale().fitContent();
  }, [bars, direction, entry, stopLoss, takeProfit1, takeProfit2, takeProfit3, signalTime, theme]);

  return <LWChart theme={theme} height={height} onChartReady={onChartReady} />;
}
