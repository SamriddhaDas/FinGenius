const express = require('express');
const { body } = require('express-validator');
const {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

const router = express.Router();
router.use(protect);

// Chat-specific rate limit — generous but not unlimited
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many messages, slow down a bit.' }
});

router.post('/message',
  chatLimiter,
  [body('message').trim().notEmpty().withMessage('Message cannot be empty')],
  validate,
  sendMessage
);

router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

module.exports = router;
