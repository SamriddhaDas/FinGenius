const { calculateHealthScore, scoreLabel } = require('../src/services/healthScoreService');

describe('Health Score Service', () => {
  describe('calculateHealthScore', () => {
    it('should return all 6 dimension scores plus overall', () => {
      const scores = calculateHealthScore({
        monthlyIncome: 100000,
        monthlyExpenses: 60000,
        monthlySavings: 30000,
        age: 30,
        retirementAge: 60,
        hasHealthInsurance: true,
        hasTermInsurance: true,
        riskProfile: 'moderate'
      });

      expect(scores).toHaveProperty('overall');
      expect(scores).toHaveProperty('emergency');
      expect(scores).toHaveProperty('savings');
      expect(scores).toHaveProperty('insurance');
      expect(scores).toHaveProperty('investment');
      expect(scores).toHaveProperty('debt');
      expect(scores).toHaveProperty('retirement');
    });

    it('should give full insurance score when both insurances present', () => {
      const scores = calculateHealthScore({
        hasHealthInsurance: true,
        hasTermInsurance: true
      });
      expect(scores.insurance).toBe(100);
    });

    it('should give 0 insurance score when neither insurance present', () => {
      const scores = calculateHealthScore({
        hasHealthInsurance: false,
        hasTermInsurance: false
      });
      expect(scores.insurance).toBe(0);
    });

    it('should give lower debt score for home loan', () => {
      const withLoan = calculateHealthScore({ hasHomeLoan: true });
      const withoutLoan = calculateHealthScore({ hasHomeLoan: false });
      expect(withLoan.debt).toBeLessThan(withoutLoan.debt);
    });

    it('should return overall between 0 and 100', () => {
      const scores = calculateHealthScore({});
      expect(scores.overall).toBeGreaterThanOrEqual(0);
      expect(scores.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('scoreLabel', () => {
    it('should return Excellent for score >= 80', () => {
      expect(scoreLabel(85).label).toBe('Excellent');
    });
    it('should return Good for score 65-79', () => {
      expect(scoreLabel(70).label).toBe('Good');
    });
    it('should return Fair for score 50-64', () => {
      expect(scoreLabel(55).label).toBe('Fair');
    });
    it('should return Needs Attention for score < 50', () => {
      expect(scoreLabel(40).label).toBe('Needs Attention');
    });
  });
});
