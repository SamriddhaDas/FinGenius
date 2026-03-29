const TaxAnalysis = require('../models/TaxAnalysis');
const { calculateTax } = require('../services/taxService');
const logger = require('../utils/logger');

// POST /api/tax/analyse
exports.analyseTax = async (req, res) => {
  try {
    const input = {
      grossSalary: req.body.grossSalary,
      hra: req.body.hra || 0,
      otherIncome: req.body.otherIncome || 0,
      deduction80C: req.body.deduction80C || 0,
      deduction80D: req.body.deduction80D || 0,
      deduction80CCD1B: req.body.deduction80CCD1B || 0,
      deductionHRA: req.body.deductionHRA || 0,
      deductionHomeLoanInterest: req.body.deductionHomeLoanInterest || 0,
      otherDeductions: req.body.otherDeductions || 0,
      age: req.user.financialProfile?.age || 30
    };

    const result = calculateTax(input);

    // Upsert for the FY
    const taxRecord = await TaxAnalysis.findOneAndUpdate(
      { user: req.user._id, financialYear: req.body.financialYear },
      {
        ...input,
        financialYear: req.body.financialYear,
        oldRegimeTax: result.oldRegime.tax,
        newRegimeTax: result.newRegime.tax,
        recommendedRegime: result.recommendedRegime,
        taxSaving: result.taxSaving,
        missedDeductions: result.missedDeductions
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, analysis: result, recordId: taxRecord._id });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Tax analysis failed' });
  }
};

// GET /api/tax/history
exports.getTaxHistory = async (req, res) => {
  try {
    const history = await TaxAnalysis
      .find({ user: req.user._id })
      .sort('-financialYear')
      .select('financialYear oldRegimeTax newRegimeTax recommendedRegime taxSaving createdAt');
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tax history' });
  }
};
