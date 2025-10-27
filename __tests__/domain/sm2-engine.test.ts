import { calculateSm2Review } from '../../src/domain/srs/sm2-engine';

describe('calculateSm2Review', () => {
  it('initial success sets base interval and increments streak', () => {
    const reviewDate = new Date('2025-01-01T00:00:00.000Z');

    const result = calculateSm2Review({
      quality: 4,
      reviewDate,
    });

    expect(result.wasSuccessful).toBe(true);
    expect(result.streak).toBe(1);
    expect(result.intervalHours).toBe(24);
    expect(result.algorithm).toBe('sm2');
    expect(result.dueAt).toBe('2025-01-02T00:00:00.000Z');
    expect(result.easeFactor).toBeCloseTo(2.5, 5);
    expect(result.lastReviewedAt).toBe(reviewDate.toISOString());
  });

  it('applies graduated intervals and ease factor across successive successes', () => {
    const firstReviewDate = new Date('2025-01-01T00:00:00.000Z');
    const secondReviewDate = new Date('2025-01-03T00:00:00.000Z');
    const thirdReviewDate = new Date('2025-01-20T00:00:00.000Z');

    const first = calculateSm2Review({
      quality: 4,
      reviewDate: firstReviewDate,
    });

    const second = calculateSm2Review({
      quality: 5,
      reviewDate: secondReviewDate,
      previous: first,
    });

    expect(second.wasSuccessful).toBe(true);
    expect(second.streak).toBe(2);
    expect(second.intervalHours).toBe(144);

    const third = calculateSm2Review({
      quality: 2,
      reviewDate: thirdReviewDate,
      previous: second,
    });

    expect(third.wasSuccessful).toBe(false);
    expect(third.streak).toBe(0);
    expect(third.intervalHours).toBe(24);
    expect(third.easeFactor).toBeLessThan(second.easeFactor);
    expect(third.dueAt).toBe('2025-01-21T00:00:00.000Z');
  });

  it('enforces quality bounds', () => {
    expect(() =>
      calculateSm2Review({
        quality: 7,
        reviewDate: new Date(),
      }),
    ).toThrow(/quality/);
  });
});
