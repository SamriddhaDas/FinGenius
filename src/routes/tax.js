const express = require('express');
const { body } = require('express-validator');
const { analyseTax, getTaxHistory } = require('../controllers/taxController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/history', getTaxHistory);

router.post('/analyse',
  [
    body('grossSalary').isNumeric().withMessage('Gross salary required'),
    body('financialYear').notEmpty().withMessage('Financial year required (e.g. 2024-25)')
  ],
  validate,
  analyseTax
);

module.exports = router;
