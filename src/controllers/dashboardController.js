const Portfolio = require('../models/Portfolio');
const Goal = require('../models/Goal');
const TaxAnalysis = require('../models/TaxAnalysis');
const { calculateHealthScore, scoreLabel } = require('../services/healthScoreService');
const { sipProjection, fireCorpus } = require('../services/financialCalcService');

// GET /api/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const profile = user.financialProfile || {};

    // ── Health Score ──────────────────────────────────────────────
    const scores = calculateHealthScore(profile);
    const { label, color } = scoreLabel(scores.overall);

    // ── Portfolio summary ─────────────────────────────────────────
    const portfolio = await Portfolio.findOne({ user: user._id });
    const portfolioSummary = portfolio
      ? {
          totalInvested: portfolio.totalInvested,
          totalCurrentValue: portfolio.totalCurrentValue,
          totalGain: portfolio.totalCurrentValue - portfolio.totalInvested,
          gainPercent: portfolio.totalInvested > 0
            ? ((portfolio.totalCurrentValue - portfolio.totalInvested) / portfolio.totalInvested * 100).toFixed(2)
            : 0,
          overallXirr: portfolio.overallXirr,
          holdingsCount: portfolio.holdings.length
        }
      : null;

    // ── Goals summary ─────────────────────────────────────────────
    const goals = await Goal.find({ user: user._id, status: 'active' });
    const goalsSummary = goals.map(g => ({
      _id: g._id,
      name: g.name,
      type: g.type,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      progressPercent: Math.round((g.currentAmount / g.targetAmount) * 100),
      targetDate: g.targetDate,
      onTrack: g.onTrack
    }));

    // ── SIP projection (for chart) ────────────────────────────────
    const monthlySavings = profile.monthlySavings || 0;
    const yearsToRetire = Math.max(1, (profile.retirementAge || 60) - (profile.age || 30));
    const projectionData = sipProjection(monthlySavings, 12, Math.min(yearsToRetire, 25));

    // ── FIRE corpus ───────────────────────────────────────────────
    const targetCorpus = fireCorpus(profile.monthlyExpenses || 0, 6, yearsToRetire);

    // ── Latest tax analysis ───────────────────────────────────────
    const latestTax = await TaxAnalysis.findOne({ user: user._id }).sort('-createdAt');

    // ── Key metrics ───────────────────────────────────────────────
    const monthlyIncome = profile.monthlyIncome || 0;
    const monthlyExpenses = profile.monthlyExpenses || 0;
    const savingsRate = monthlyIncome > 0
      ? ((monthlySavings / monthlyIncome) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      dashboard: {
        user: { name: user.name, onboardingCompleted: user.onboardingCompleted },
        healthScore: { ...scores, label, color },
        keyMetrics: {
          monthlyIncome,
          monthlyExpenses,
          monthlySavings,
          savingsRate: parseFloat(savingsRate),
          targetCorpus: Math.round(targetCorpus),
          yearsToRetire
        },
        portfolio: portfolioSummary,
        goals: goalsSummary,
        sipProjection: projectionData,
        latestTax: latestTax
          ? {
              financialYear: latestTax.financialYear,
              recommendedRegime: latestTax.recommendedRegime,
              taxSaving: latestTax.taxSaving
            }
          : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Dashboard load failed' });
  }
};
