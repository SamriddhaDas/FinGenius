const Portfolio = require('../models/Portfolio');
const { calculateXIRR } = require('../services/financialCalcService');
const logger = require('../utils/logger');

// GET /api/portfolio
exports.getPortfolio = async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      portfolio = await Portfolio.create({ user: req.user._id, holdings: [] });
    }
    res.json({ success: true, portfolio });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch portfolio' });
  }
};

// POST /api/portfolio/holdings
exports.addHolding = async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      portfolio = await Portfolio.create({ user: req.user._id, holdings: [] });
    }

    portfolio.holdings.push(req.body);
    await portfolio.save();
    res.status(201).json({ success: true, portfolio });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Failed to add holding' });
  }
};

// PATCH /api/portfolio/holdings/:holdingId
exports.updateHolding = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found' });

    const holding = portfolio.holdings.id(req.params.holdingId);
    if (!holding) return res.status(404).json({ success: false, message: 'Holding not found' });

    Object.assign(holding, req.body);
    await portfolio.save();
    res.json({ success: true, portfolio });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// DELETE /api/portfolio/holdings/:holdingId
exports.deleteHolding = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found' });

    portfolio.holdings = portfolio.holdings.filter(h => h._id.toString() !== req.params.holdingId);
    await portfolio.save();
    res.json({ success: true, message: 'Holding removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

// POST /api/portfolio/xray  — Run MF X-Ray analysis
exports.runXray = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio || portfolio.holdings.length === 0) {
      return res.status(400).json({ success: false, message: 'No holdings to analyse' });
    }

    // ── Direct vs Regular plan analysis ──────────────────────────
    const regularPlanFunds = portfolio.holdings.filter(h => h.planType === 'regular');
    const potentialSaving = regularPlanFunds.reduce((sum, h) => {
      const expenseDiff = (h.expenseRatio || 1.5) - 0.5;  // assume direct saves ~1%
      return sum + (h.currentValue * expenseDiff) / 100;
    }, 0);

    // ── Category concentration ────────────────────────────────────
    const categoryMap = {};
    for (const h of portfolio.holdings) {
      const cat = h.category || 'unknown';
      categoryMap[cat] = (categoryMap[cat] || 0) + h.currentValue;
    }
    const totalValue = portfolio.totalCurrentValue || 1;
    const allocation = Object.entries(categoryMap).map(([cat, val]) => ({
      category: cat,
      value: val,
      percent: parseFloat(((val / totalValue) * 100).toFixed(1))
    }));

    // ── Large-cap overlap heuristic ───────────────────────────────
    const largecapFunds = portfolio.holdings.filter(h =>
      ['large_cap', 'flexi_cap'].includes(h.category)
    );
    const overlapScore = largecapFunds.length >= 2 ? Math.min(60, largecapFunds.length * 15) : 0;

    // ── XIRR (if cashflow data provided in body) ──────────────────
    let xirr = portfolio.overallXirr || null;
    if (req.body.cashflows) {
      xirr = calculateXIRR(req.body.cashflows);
      portfolio.overallXirr = xirr;
    }

    portfolio.overlapScore = overlapScore;
    portfolio.lastXrayAt = new Date();
    await portfolio.save();

    // ── Recommendations ───────────────────────────────────────────
    const recommendations = [];
    if (regularPlanFunds.length > 0) {
      recommendations.push({
        type: 'switch_to_direct',
        title: 'Switch to Direct Plans',
        description: `${regularPlanFunds.length} fund(s) on regular plan. Potential annual saving: ₹${Math.round(potentialSaving).toLocaleString('en-IN')}`,
        priority: 'high',
        funds: regularPlanFunds.map(f => f.fundName)
      });
    }
    if (overlapScore > 30) {
      recommendations.push({
        type: 'reduce_overlap',
        title: 'High Portfolio Overlap',
        description: `Estimated ${overlapScore}% overlap between large-cap/flexi-cap funds. Consider exiting one fund.`,
        priority: 'medium'
      });
    }

    // Check if any category exceeds 60%
    const concentrated = allocation.find(a => a.percent > 60);
    if (concentrated) {
      recommendations.push({
        type: 'diversify',
        title: 'Over-Concentration Risk',
        description: `${concentrated.category} is ${concentrated.percent}% of portfolio. Diversify into other asset classes.`,
        priority: 'high'
      });
    }

    res.json({
      success: true,
      xray: {
        totalInvested: portfolio.totalInvested,
        totalCurrentValue: portfolio.totalCurrentValue,
        overallXirr: xirr,
        overlapScore,
        allocation,
        potentialExpenseSaving: Math.round(potentialSaving),
        recommendations,
        analysedAt: portfolio.lastXrayAt
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'X-Ray analysis failed' });
  }
};
