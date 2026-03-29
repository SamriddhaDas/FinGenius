const Conversation = require('../models/Conversation');
const { callAI, detectAgent } = require('../services/aiService');
const logger = require('../utils/logger');

// POST /api/chat/message
exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user._id;

    // Load or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, user: userId });
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }
    } else {
      conversation = await Conversation.create({
        user: userId,
        title: message.slice(0, 60),
        messages: []
      });
    }

    // Detect agent
    const agent = detectAgent(message);
    conversation.agent = agent;

    // Add user message to history
    conversation.messages.push({ role: 'user', content: message, agent });

    // Call AI
    const userProfile = req.user.financialProfile || {};
    const aiResult = await callAI({
      agent,
      history: conversation.messages.slice(-20),
      userMessage: message,
      userProfile
    });

    // Build assistant message
    const assistantMsg = {
      role: 'assistant',
      content: aiResult.text || '',
      agent: aiResult.agent || agent,
      richBlocks: aiResult.richBlocks || [],
      suggestions: aiResult.suggestions || []
    };

    conversation.messages.push(assistantMsg);

    // Update health score if returned
    if (aiResult.scores && agent === 'health_score') {
      req.user.healthScore = {
        ...aiResult.scores,
        lastCalculated: new Date()
      };
      await req.user.save({ validateBeforeSave: false });
    }

    await conversation.save();

    res.json({
      success: true,
      conversationId: conversation._id,
      message: assistantMsg
    });
  } catch (err) {
    logger.error(`Chat error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to process message' });
  }
};

// GET /api/chat/conversations
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation
      .find({ user: req.user._id, isArchived: false })
      .select('title agent createdAt updatedAt')
      .sort('-updatedAt')
      .limit(50);

    res.json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

// GET /api/chat/conversations/:id
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
};

// DELETE /api/chat/conversations/:id
exports.deleteConversation = async (req, res) => {
  try {
    await Conversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};
