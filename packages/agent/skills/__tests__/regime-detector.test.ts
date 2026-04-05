type Regime = 'trending' | 'ranging' | 'volatile';

function classifyRegime(adxValue: number, adxTrending: boolean, bbBandwidth: number): Regime {
  if (adxTrending && bbBandwidth >= 1.5) return 'trending';
  if (adxValue >= 20 && bbBandwidth < 1.5) return 'volatile';
  if (!adxTrending) return 'ranging';
  return 'trending';
}

describe('RegimeDetectorSkill — classifyRegime', () => {
  it('classifies ADX 35, trending=true, bandwidth 3.0 as trending', () => {
    expect(classifyRegime(35, true, 3.0)).toBe('trending');
  });

  it('classifies ADX 18, trending=false, bandwidth 2.0 as ranging', () => {
    expect(classifyRegime(18, false, 2.0)).toBe('ranging');
  });

  it('classifies ADX 22, trending=false, bandwidth 1.0 as volatile', () => {
    expect(classifyRegime(22, false, 1.0)).toBe('volatile');
  });

  it('classifies ADX 50, trending=true, bandwidth 5.0 as trending', () => {
    expect(classifyRegime(50, true, 5.0)).toBe('trending');
  });

  it('classifies ADX 28, trending=true, bandwidth 1.2 as volatile', () => {
    expect(classifyRegime(28, true, 1.2)).toBe('volatile');
  });
});
