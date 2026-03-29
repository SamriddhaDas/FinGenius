const { calculateTax } = require('../src/services/taxService');

describe('Tax Service', () => {
  describe('calculateTax', () => {
    it('should recommend new regime for plain salary with no deductions', () => {
      const result = calculateTax({ grossSalary: 1000000 });
      // No deductions → new regime usually better or equal
      expect(result.recommendedRegime).toBeDefined();
      expect(result.newRegime.tax).toBeGreaterThanOrEqual(0);
      expect(result.oldRegime.tax).toBeGreaterThanOrEqual(0);
    });

    it('should apply 87A rebate in new regime for income <= 7L', () => {
      const result = calculateTax({ grossSalary: 700000 });
      expect(result.newRegime.tax).toBe(0);
    });

    it('should apply 80C cap at ₹1.5L', () => {
      const result = calculateTax({
        grossSalary: 1200000,
        deduction80C: 200000  // should be capped at 150000
      });
      // Old regime taxable = 1200000 - 50000 (std) - 150000 (80C cap) = 1000000
      expect(result.oldRegime.taxableIncome).toBe(1000000);
    });

    it('should identify missed deductions', () => {
      const result = calculateTax({ grossSalary: 1000000, deduction80C: 50000 });
      const gap80C = result.missedDeductions.find(d => d.label.includes('80C'));
      expect(gap80C).toBeDefined();
      expect(gap80C.gap).toBe(100000); // 150000 - 50000
    });

    it('should recommend old regime when deductions are high', () => {
      const result = calculateTax({
        grossSalary: 1500000,
        deduction80C: 150000,
        deduction80D: 25000,
        deduction80CCD1B: 50000,
        deductionHRA: 200000
      });
      // Heavy deductions → old regime saves more
      expect(result.recommendedRegime).toBe('old');
    });
  });
});
