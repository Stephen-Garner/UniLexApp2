export const computeAccuracy = (correct: number, incorrect: number): number => {
  const total = Math.max(1, correct + incorrect);
  return correct / total;
};

export const formatAccuracy = (fraction: number): string =>
  `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;

export const averageDurationSeconds = (durations: number[]): number => {
  if (durations.length === 0) {
    return 0;
  }
  const sum = durations.reduce((acc, value) => acc + value, 0);
  return sum / durations.length;
};

export const formatSeconds = (seconds: number): string => `${Math.round(seconds)}s`;
