/**
 * FinGenius Money Health Score Engine
 * Calculates 6-dimension financial wellness scores (0–100 each)
 */

/**
 * @param {Object} profile - User financialProfile
 * @returns {Object} scores
 */
const calculateHealthScore = (profile) => {
  const {
    monthlyIncome = 0,
    monthlyExpenses = 0,
    monthlySavings = 0,
    age = 30,
    retirementAge = 60,
    hasHealthInsurance = false,
    hasTermInsurance = false,
    hasHomeLoan = false,
    riskProfile = 'moderate'
  } = profile;

  const scores = {};

  // ── 1. Emergency Fund (0-100) ─────────────────────────────────────
  // Target: 6 months of expenses in liquid form
  // Proxy: savings rate suggests ability to build emergency fund
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const emergencyMonths = monthlyExpenses > 0 ? (monthlySavings * 3) / monthlyExpenses : 0;
  scores.emergency = Math.min(100, Math.round((emergencyMonths / 6) * 100));

  // ── 2. Savings Rate (0-100) ───────────────────────────────────────
  // Benchmark: 20% = 60 pts, 30% = 80 pts, 40%+ = 100 pts
  if (savingsRate >= 40) scores.savings = 100;
  else if (savingsRate >= 30) scores.savings = 80;
  else if (savingsRate >= 20) scores.savings = 60;
  else if (savingsRate >= 10) scores.savings = 40;
  else scores.savings = Math.round(savingsRate * 2);

  // ── 3. Insurance Coverage (0-100) ─────────────────────────────────
  let insuranceScore = 0;
  if (hasHealthInsurance) insuranceScore += 50;
  if (hasTermInsurance) insuranceScore += 50;
  scores.insurance = insuranceScore;

  // ── 4. Investment Diversification (0-100) ────────────────────────
  // Proxy: savings rate + risk profile alignment
  const riskBonus = riskProfile === 'aggressive' ? 10 : riskProfile === 'moderate' ? 5 : 0;
  scores.investment = Math.min(100, Math.round(scores.savings * 0.7 + riskBonus + 20));

  // ── 5. Debt Management (0-100) ────────────────────────────────────
  // Home loan is "good debt" — mild penalty; no debt = 100
  scores.debt = hasHomeLoan ? 70 : 100;

  // ── 6. Retirement Readiness (0-100) ──────────────────────────────
  const yearsToRetire = Math.max(0, retirementAge - age);
  const retirementBonus = yearsToRetire >= 25 ? 20 : yearsToRetire >= 15 ? 10 : 0;
  scores.retirement = Math.min(100, Math.round(scores.savings * 0.6 + retirementBonus + 10));

  // ── Overall (weighted average) ────────────────────────────────────
  const weights = {
    emergency: 0.20,
    savings: 0.20,
    insurance: 0.15,
    investment: 0.20,
    debt: 0.10,
    retirement: 0.15
  };

  scores.overall = Math.round(
    Object.entries(weights).reduce((sum, [key, w]) => sum + (scores[key] * w), 0)
  );

  return scores;
};

/**
 * Returns a label for the overall score
 */
const scoreLabel = (overall) => {
  if (overall >= 80) return { label: 'Excellent', color: '#00d4aa' };
  if (overall >= 65) return { label: 'Good', color: '#4f8aff' };
  if (overall >= 50) return { label: 'Fair', color: '#f5a623' };
  return { label: 'Needs Attention', color: '#ff6b6b' };
};

module.exports = { calculateHealthScore, scoreLabel };
