/**
 * FinGenius Financial Calculation Service
 * SIP projections, FIRE corpus, XIRR approximation, loan EMI
 */

/**
 * Future value of regular SIP
 * FV = P * [((1+r)^n - 1) / r] * (1+r)
 * @param {number} monthlyAmount - SIP per month (₹)
 * @param {number} annualRate - Expected return % p.a.
 * @param {number} years
 */
const sipFutureValue = (monthlyAmount, annualRate, years) => {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthlyAmount * n;
  return monthlyAmount * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
};

/**
 * Monthly SIP needed to reach a target corpus
 */
const sipRequired = (targetCorpus, annualRate, years) => {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return targetCorpus / n;
  return targetCorpus / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
};

/**
 * FIRE corpus needed
 * Using 4% safe withdrawal rule: corpus = annualExpenses / 0.04
 */
const fireCorpus = (monthlyExpenses, inflationRate = 6, yearsToRetire = 25) => {
  const futureMonthlyExpense = monthlyExpenses * Math.pow(1 + inflationRate / 100, yearsToRetire);
  const annualExpense = futureMonthlyExpense * 12;
  return annualExpense / 0.04;
};

/**
 * EMI calculation
 */
const emiCalculator = (principal, annualRate, tenureYears) => {
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

/**
 * Build year-by-year SIP projection for chart data
 */
const sipProjection = (monthlySIP, annualRate, years) => {
  const data = [];
  for (let y = 0; y <= years; y++) {
    const corpus = sipFutureValue(monthlySIP, annualRate, y);
    const invested = monthlySIP * 12 * y;
    data.push({
      year: y,
      corpus: Math.round(corpus),
      invested: Math.round(invested),
      gains: Math.round(corpus - invested)
    });
  }
  return data;
};

/**
 * Approximate XIRR using Newton-Raphson method
 * @param {Array} cashflows [{amount, date}] — negative for investments, positive for redemption
 */
const calculateXIRR = (cashflows) => {
  if (!cashflows || cashflows.length < 2) return null;

  const DAYS_IN_YEAR = 365;
  const t0 = cashflows[0].date;

  const npv = (rate) => cashflows.reduce((sum, cf) => {
    const t = (new Date(cf.date) - new Date(t0)) / (1000 * 60 * 60 * 24 * DAYS_IN_YEAR);
    return sum + cf.amount / Math.pow(1 + rate, t);
  }, 0);

  const dnpv = (rate) => cashflows.reduce((sum, cf) => {
    const t = (new Date(cf.date) - new Date(t0)) / (1000 * 60 * 60 * 24 * DAYS_IN_YEAR);
    return sum - t * cf.amount / Math.pow(1 + rate, t + 1);
  }, 0);

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (Math.abs(df) < 1e-10) break;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-8) return parseFloat((newRate * 100).toFixed(2));
    rate = newRate;
  }
  return parseFloat((rate * 100).toFixed(2));
};

module.exports = { sipFutureValue, sipRequired, fireCorpus, emiCalculator, sipProjection, calculateXIRR };
