const express = require('express');
const { body } = require('express-validator');
const { getGoals, createGoal, updateGoal, deleteGoal, projectGoal } = require('../controllers/goalController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', getGoals);
router.get('/:id/project', projectGoal);

router.post('/',
  [
    body('name').trim().notEmpty(),
    body('targetAmount').isNumeric().isFloat({ gt: 0 }),
    body('targetDate').isISO8601().withMessage('Valid target date required'),
    body('type').optional().isIn(['retirement','home','education','emergency','travel','vehicle','wedding','other'])
  ],
  validate,
  createGoal
);

router.patch('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
