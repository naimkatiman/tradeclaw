'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  AreaSeries,
  CrosshairMode,
  ColorType,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';

interface SparklineChartProps {
  prices: number[];
  direction: 'BUY' | 'SELL';
  width?: number;
  height?: number;
}

export default function SparklineChart({
  prices,
  direction,
  width = 80,
  height = 30,
}: SparklineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const lineColor = direction === 'BUY' ? '#10b981' : '#f43f5e';
    const topColor = direction === 'BUY' ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)';

    const chart = createChart(el, {
      width,
      height,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: 'transparent' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: CrosshairMode.Hidden },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor: 'transparent',
      lineWidth: 1,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    if (prices.length >= 2) {
      const baseTime = Math.floor(Date.now() / 1000) - prices.length * 3600;
      series.setData(
        prices.map((value, i) => ({
          time: (baseTime + i * 3600) as UTCTimestamp,
          value,
        })),
      );
    }

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [prices, direction, width, height]);

  return <div ref={containerRef} style={{ width, height }} className="opacity-90" />;
}
