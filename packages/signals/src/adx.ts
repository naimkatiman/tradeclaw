import { clamp } from './index.js';

export function calculateADX(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): { value: number; plusDI: number; minusDI: number; trending: boolean } {
  const neutral = { value: 0, plusDI: 0, minusDI: 0, trending: false };

  if (high.length < period + 1 || low.length < period + 1 || close.length < period + 1) {
    return neutral;
  }

  const len = Math.min(high.length, low.length, close.length);

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < len; i++) {
    const highDiff = high[i] - high[i - 1];
    const lowDiff = low[i - 1] - low[i];

    const trueRange = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );

    tr.push(trueRange);
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }

  if (tr.length < period) return neutral;

  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxValues: number[] = [];

  const firstPlusDI = smoothTR !== 0 ? clamp((smoothPlusDM / smoothTR) * 100, 0, 100) : 0;
  const firstMinusDI = smoothTR !== 0 ? clamp((smoothMinusDM / smoothTR) * 100, 0, 100) : 0;
  const firstDISum = firstPlusDI + firstMinusDI;
  if (firstDISum !== 0) {
    dxValues.push(clamp((Math.abs(firstPlusDI - firstMinusDI) / firstDISum) * 100, 0, 100));
  } else {
    dxValues.push(0);
  }

  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    const pdi = smoothTR !== 0 ? clamp((smoothPlusDM / smoothTR) * 100, 0, 100) : 0;
    const mdi = smoothTR !== 0 ? clamp((smoothMinusDM / smoothTR) * 100, 0, 100) : 0;
    const diSum = pdi + mdi;
    const dx = diSum !== 0 ? clamp((Math.abs(pdi - mdi) / diSum) * 100, 0, 100) : 0;
    dxValues.push(dx);
  }

  let adx: number;
  if (dxValues.length < period) {
    adx = dxValues.reduce((a, b) => a + b, 0) / dxValues.length;
  } else {
    adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxValues.length; i++) {
      adx = (adx * (period - 1) + dxValues[i]) / period;
    }
  }

  const value = clamp(adx, 0, 100);
  const plusDI = clamp(
    smoothTR !== 0 ? (smoothPlusDM / smoothTR) * 100 : 0,
    0,
    100
  );
  const minusDI = clamp(
    smoothTR !== 0 ? (smoothMinusDM / smoothTR) * 100 : 0,
    0,
    100
  );

  return { value, plusDI, minusDI, trending: value >= 25 };
}
