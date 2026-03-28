'use client';

import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createChart, type IChartApi } from 'lightweight-charts';
import type { ChartTheme } from './types';

interface LWChartProps {
  theme: ChartTheme;
  height?: number;
  autoSize?: boolean;
  onChartReady?: (chart: IChartApi) => void;
}

export default function LWChart({ theme, height = 400, autoSize = true, onChartReady }: LWChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const onReadyRef = useRef(onChartReady);

  useLayoutEffect(() => {
    onReadyRef.current = onChartReady;
  });

  const applyTheme = useCallback((chart: IChartApi, t: ChartTheme) => {
    chart.applyOptions({
      layout: {
        background: { color: t.backgroundColor },
        textColor: t.textColor,
      },
      grid: {
        vertLines: { color: t.gridColor },
        horzLines: { color: t.gridColor },
      },
      crosshair: {
        vertLine: { color: t.crosshairColor, labelBackgroundColor: t.crosshairColor },
        horzLine: { color: t.crosshairColor, labelBackgroundColor: t.crosshairColor },
      },
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { color: theme.backgroundColor },
        textColor: theme.textColor,
      },
      grid: {
        vertLines: { color: theme.gridColor },
        horzLines: { color: theme.gridColor },
      },
      crosshair: {
        vertLine: { color: theme.crosshairColor, labelBackgroundColor: theme.crosshairColor },
        horzLine: { color: theme.crosshairColor, labelBackgroundColor: theme.crosshairColor },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    let ro: ResizeObserver | undefined;
    if (autoSize) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) chart.applyOptions({ width: w });
        }
      });
      ro.observe(container);
    }

    onReadyRef.current?.(chart);

    return () => {
      ro?.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chartRef.current) applyTheme(chartRef.current, theme);
  }, [theme, applyTheme]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height }}
      className="rounded-lg overflow-hidden"
    />
  );
}
