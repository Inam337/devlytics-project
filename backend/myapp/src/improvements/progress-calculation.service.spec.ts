import { ProgressCalculationService } from './progress-calculation.service';

describe('ProgressCalculationService', () => {
  const service = new ProgressCalculationService();

  describe('DECREASE metrics', () => {
    it('measures progress against baseline→target, not current/target (pasted spec §18 worked example)', () => {
      // Baseline 8.4, target 5.0, current 5.7 → needed movement 3.4, achieved 2.7 => ~79%.
      // A naive (current/target)*100 would read this as 114%, which is wrong for a DECREASE metric.
      const percent = service.percentComplete('DECREASE', 8.4, 5.0, 5.7);
      expect(percent).toBeCloseTo(79.41, 1);
      expect(service.achieved('DECREASE', 5.0, 5.7)).toBe(false);
    });

    it('is achieved once the current value reaches or passes the target', () => {
      expect(service.achieved('DECREASE', 5.0, 4.9)).toBe(true);
      expect(service.achieved('DECREASE', 5.0, 5.0)).toBe(true);
    });

    it('reports negative progress when the metric moves the wrong way', () => {
      const percent = service.percentComplete('DECREASE', 8.4, 5.0, 9.0);
      expect(percent).toBeLessThan(0);
    });
  });

  describe('INCREASE metrics', () => {
    it('measures progress toward a higher target', () => {
      // Baseline 3.2, target 5.0, current 4.1 → needed 1.8, achieved 0.9 => 50%.
      const percent = service.percentComplete('INCREASE', 3.2, 5.0, 4.1);
      expect(percent).toBeCloseTo(50, 0);
      expect(service.achieved('INCREASE', 5.0, 4.1)).toBe(false);
      expect(service.achieved('INCREASE', 5.0, 5.0)).toBe(true);
    });
  });

  describe('TARGET_RANGE metrics', () => {
    it('is achieved within tolerance of the target and not achieved outside it', () => {
      expect(service.achieved('TARGET_RANGE', 100, 104)).toBe(true); // 4% deviation, within 5% tolerance
      expect(service.achieved('TARGET_RANGE', 100, 120)).toBe(false); // 20% deviation
    });
  });

  describe('status', () => {
    const startDate = new Date('2026-09-01T00:00:00.000Z');

    it('is NOT_STARTED when there is no baseline or current measurement yet', () => {
      expect(
        service.status({ direction: 'DECREASE', baseline: null, target: 5, current: null, startDate }),
      ).toBe('NOT_STARTED');
    });

    it('is TARGET_REACHED once the metric achieves its target', () => {
      expect(
        service.status({ direction: 'DECREASE', baseline: 8.4, target: 5, current: 4.9, startDate }),
      ).toBe('TARGET_REACHED');
    });

    it('is OFF_TRACK when the metric has moved away from the target', () => {
      expect(
        service.status({ direction: 'DECREASE', baseline: 8.4, target: 5, current: 9.5, startDate }),
      ).toBe('OFF_TRACK');
    });

    it('is AT_RISK once most of the window has elapsed with little progress', () => {
      const endDate = new Date('2026-09-10T00:00:00.000Z'); // 9-day window
      const now = new Date('2026-09-09T00:00:00.000Z'); // 89% elapsed
      expect(
        service.status({ direction: 'DECREASE', baseline: 8.4, target: 5, current: 8.0, startDate, endDate, now }),
      ).toBe('AT_RISK');
    });

    it('is ON_TRACK when progress is past the halfway point', () => {
      expect(
        service.status({ direction: 'DECREASE', baseline: 8.4, target: 5, current: 5.7, startDate }),
      ).toBe('ON_TRACK');
    });
  });
});
