const express = require('express');
const { body } = require('express-validator');
const {
  getPortfolio,
  addHolding,
  updateHolding,
  deleteHolding,
  runXray
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', getPortfolio);
router.post('/xray', runXray);

router.post('/holdings',
  [
    body('fundName').trim().notEmpty().withMessage('Fund name required'),
    body('investedAmount').isNumeric().withMessage('Invested amount must be numeric'),
    body('currentValue').isNumeric().withMessage('Current value must be numeric')
  ],
  validate,
  addHolding
);

router.patch('/holdings/:holdingId', updateHolding);
router.delete('/holdings/:holdingId', deleteHolding);

module.exports = router;
