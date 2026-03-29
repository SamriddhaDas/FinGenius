const express = require('express');
const { body } = require('express-validator');
const { getProfile, updateProfile, completeOnboarding } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);

router.patch('/profile',
  [
    body('name').optional().trim().notEmpty(),
    body('financialProfile.monthlyIncome').optional().isNumeric(),
    body('financialProfile.monthlyExpenses').optional().isNumeric(),
    body('financialProfile.age').optional().isInt({ min: 18, max: 80 }),
    body('financialProfile.riskProfile').optional().isIn(['conservative', 'moderate', 'aggressive'])
  ],
  validate,
  updateProfile
);

router.post('/onboarding', completeOnboarding);

module.exports = router;
