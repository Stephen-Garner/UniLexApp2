import {
  averageDurationSeconds,
  computeAccuracy,
  formatAccuracy,
  formatSeconds,
} from '@/features/translation/utils/session-stats';

describe('translation session stats', () => {
  test('computeAccuracy guards against division by zero', () => {
    expect(computeAccuracy(0, 0)).toBe(0);
    expect(computeAccuracy(3, 1)).toBe(0.75);
  });

  test('formatAccuracy clamps between 0 and 1 and formats as percent', () => {
    expect(formatAccuracy(0)).toBe('0%');
    expect(formatAccuracy(0.456)).toBe('46%');
    expect(formatAccuracy(1.5)).toBe('100%');
  });

  test('averageDurationSeconds returns 0 for empty arrays', () => {
    expect(averageDurationSeconds([])).toBe(0);
    expect(averageDurationSeconds([2, 4, 6])).toBe(4);
  });

  test('formatSeconds rounds to whole seconds', () => {
    expect(formatSeconds(3.4)).toBe('3s');
    expect(formatSeconds(3.6)).toBe('4s');
  });
});
