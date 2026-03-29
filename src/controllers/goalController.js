const Goal = require('../models/Goal');
const { sipRequired, sipFutureValue } = require('../services/financialCalcService');

const computeGoalMetrics = (goal) => {
  const today = new Date();
  const yearsLeft = Math.max(0.1, (new Date(goal.targetDate) - today) / (1000 * 60 * 60 * 24 * 365));
  const returnRate = goal.expectedReturnRate || 12;

  const projectedCorpus = sipFutureValue(goal.monthlyContribution, returnRate, yearsLeft)
    + goal.currentAmount * Math.pow(1 + returnRate / 100, yearsLeft);

  const requiredSIP = sipRequired(
    Math.max(0, goal.targetAmount - goal.currentAmount),
    returnRate,
    yearsLeft
  );

  const shortfall = Math.max(0, goal.targetAmount - projectedCorpus);
  const onTrack = projectedCorpus >= goal.targetAmount * 0.9;

  return { projectedCorpus: Math.round(projectedCorpus), shortfall: Math.round(shortfall), onTrack, requiredSIP: Math.round(requiredSIP) };
};

// GET /api/goals
exports.getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort('-priority createdAt');
    const goalsWithMetrics = goals.map(g => ({
      ...g.toObject(),
      ...computeGoalMetrics(g)
    }));
    res.json({ success: true, goals: goalsWithMetrics });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch goals' });
  }
};

// POST /api/goals
exports.createGoal = async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user._id });
    const metrics = computeGoalMetrics(goal);
    goal.projectedCorpus = metrics.projectedCorpus;
    goal.shortfall = metrics.shortfall;
    goal.onTrack = metrics.onTrack;
    await goal.save();
    res.status(201).json({ success: true, goal: { ...goal.toObject(), ...metrics } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Goal creation failed' });
  }
};

// PATCH /api/goals/:id
exports.updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    const metrics = computeGoalMetrics(goal);
    res.json({ success: true, goal: { ...goal.toObject(), ...metrics } });
  } catch {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// DELETE /api/goals/:id
exports.deleteGoal = async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Goal deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

// GET /api/goals/:id/project
exports.projectGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const today = new Date();
    const yearsLeft = Math.max(0.1, (new Date(goal.targetDate) - today) / (1000 * 60 * 60 * 24 * 365));
    const returnRate = goal.expectedReturnRate || 12;

    const projection = [];
    for (let y = 0; y <= Math.ceil(yearsLeft); y++) {
      projection.push({
        year: y,
        corpus: Math.round(sipFutureValue(goal.monthlyContribution, returnRate, y)
          + goal.currentAmount * Math.pow(1 + returnRate / 100, y))
      });
    }

    res.json({ success: true, projection, ...computeGoalMetrics(goal) });
  } catch {
    res.status(500).json({ success: false, message: 'Projection failed' });
  }
};
