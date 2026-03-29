const {
  sipFutureValue,
  sipRequired,
  fireCorpus,
  emiCalculator,
  calculateXIRR
} = require('../src/services/financialCalcService');

describe('Financial Calculation Service', () => {
  describe('sipFutureValue', () => {
    it('should calculate future value of SIP correctly', () => {
      // ₹10,000/month at 12% for 10 years
      const fv = sipFutureValue(10000, 12, 10);
      expect(fv).toBeGreaterThan(2000000); // > ₹20L
      expect(fv).toBeLessThan(2500000);    // < ₹25L
    });

    it('should return 0 for 0 monthly amount', () => {
      expect(sipFutureValue(0, 12, 10)).toBe(0);
    });

    it('should handle 0% return rate', () => {
      const fv = sipFutureValue(10000, 0, 10);
      expect(fv).toBe(10000 * 120); // simple sum
    });
  });

  describe('sipRequired', () => {
    it('should give monthly SIP to reach ₹1 crore in 20 years at 12%', () => {
      const sip = sipRequired(10000000, 12, 20);
      expect(sip).toBeGreaterThan(10000);
      expect(sip).toBeLessThan(20000);
    });
  });

  describe('fireCorpus', () => {
    it('should calculate FIRE corpus using 4% rule', () => {
      // ₹50K/month expenses, 6% inflation, 25 years → FME + 4% rule
      const corpus = fireCorpus(50000, 6, 25);
      expect(corpus).toBeGreaterThan(50000000); // > ₹5 crore
    });
  });

  describe('emiCalculator', () => {
    it('should calculate home loan EMI', () => {
      // ₹50L at 8.5% for 20 years
      const emi = emiCalculator(5000000, 8.5, 20);
      expect(emi).toBeGreaterThan(40000);
      expect(emi).toBeLessThan(50000);
    });
  });

  describe('calculateXIRR', () => {
    it('should return null for insufficient cashflows', () => {
      expect(calculateXIRR([{ amount: -10000, date: '2023-01-01' }])).toBeNull();
    });

    it('should calculate approximate XIRR', () => {
      const cashflows = [
        { amount: -120000, date: '2023-01-01' },
        { amount: 140000, date: '2024-01-01' }
      ];
      const xirr = calculateXIRR(cashflows);
      expect(xirr).toBeGreaterThan(14);
      expect(xirr).toBeLessThan(18);
    });
  });
});
