const User = require('../models/User');
const logger = require('../utils/logger');

// GET /api/user/profile
exports.getProfile = async (req, res) => {
  res.json({ success: true, user: req.user.toPublic() });
};

// PATCH /api/user/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, financialProfile } = req.body;
    const update = {};
    if (name) update.name = name;
    if (financialProfile) {
      for (const [key, val] of Object.entries(financialProfile)) {
        update[`financialProfile.${key}`] = val;
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });
    res.json({ success: true, user: user.toPublic() });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Profile update failed' });
  }
};

// POST /api/user/onboarding
exports.completeOnboarding = async (req, res) => {
  try {
    const fields = [
      'monthlyIncome', 'monthlyExpenses', 'age', 'retirementAge',
      'riskProfile', 'taxRegime', 'hasHomeLoan', 'hasHealthInsurance',
      'hasTermInsurance', 'maritalStatus', 'dependents', 'city', 'employmentType'
    ];

    const update = { 'onboardingCompleted': true };
    for (const f of fields) {
      if (req.body[f] !== undefined) update[`financialProfile.${f}`] = req.body[f];
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
    res.json({ success: true, message: 'Onboarding complete', user: user.toPublic() });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Onboarding failed' });
  }
};
