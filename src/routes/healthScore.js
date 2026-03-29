const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { calculateHealthScore, scoreLabel } = require('../services/healthScoreService');
const User = require('../models/User');

router.use(protect);

// GET /api/health-score
router.get('/', async (req, res) => {
  try {
    const profile = req.user.financialProfile || {};
    const scores = calculateHealthScore(profile);
    const meta = scoreLabel(scores.overall);

    // Persist latest scores
    await User.findByIdAndUpdate(req.user._id, {
      $set: { healthScore: { ...scores, lastCalculated: new Date() } }
    });

    res.json({ success: true, scores, ...meta });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Score calculation failed' });
  }
});

module.exports = router;
