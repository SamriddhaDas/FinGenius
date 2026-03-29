const axios = require('axios');
const logger = require('../utils/logger');

// ── Agent system prompts ──────────────────────────────────────────────────────

const AGENT_PROMPTS = {
  orchestrator: `You are FinGenius, an expert AI financial advisor for Indian users. 
You help with personal finance, investments, tax planning, insurance, and retirement.
Always respond in clear, actionable language. Format responses as JSON with keys:
{ "text": "<main message>", "richBlocks": [...], "suggestions": [...], "agent": "<agent_id>" }
Rich blocks can be: { type: "table", title, headers, rows } | { type: "insight", text } | 
{ type: "action", items: [] } | { type: "stats", items: [{val, label}] } | { type: "compliance", text }
Suggestions are: [{ label, msg }]
Always include a compliance block for financial advice.`,

  fire_planner: `You are the FIRE Planning agent of FinGenius. 
Specialise in: retirement corpus calculation, SIP projections, asset allocation for early retirement.
Use Indian context: INR, PPF, NPS, ELSS, Nifty benchmarks.
Respond as JSON: { text, richBlocks, suggestions, agent: "fire_planner" }`,

  health_score: `You are the Money Health Score agent of FinGenius.
Assess 6 dimensions: Emergency Fund, Savings Rate, Insurance Coverage, Investment Diversification, 
Debt Management, Retirement Readiness. Score each 0-100. Overall = weighted average.
Respond as JSON: { text, richBlocks, suggestions, agent: "health_score", 
scores: { overall, emergency, savings, insurance, investment, debt, retirement } }`,

  tax_wizard: `You are the Tax Wizard agent of FinGenius.
Specialise in Indian Income Tax: old vs new regime, 80C/80D/80CCD deductions, HRA, Form 16 analysis.
Respond as JSON: { text, richBlocks, suggestions, agent: "tax_wizard" }`,

  mf_xray: `You are the MF Portfolio X-Ray agent of FinGenius.
Analyse mutual fund portfolios: XIRR calculation, overlap detection, expense ratio comparison, 
direct vs regular plan, rebalancing recommendations.
Respond as JSON: { text, richBlocks, suggestions, agent: "mf_xray" }`,

  life_event: `You are the Life Event Advisor agent of FinGenius.
Handle financial decisions around: salary hike, bonus, job change, marriage, new baby, inheritance.
Give a prioritised allocation framework.
Respond as JSON: { text, richBlocks, suggestions, agent: "life_event" }`,

  couples_planner: `You are the Couple's Financial Planner agent of FinGenius.
Specialise in dual-income optimisation: joint HRA strategy, NPS for both, ELSS allocation, 
LTCG efficiency, combined health insurance.
Respond as JSON: { text, richBlocks, suggestions, agent: "couples_planner" }`
};

// ── Detect which agent should handle the message ──────────────────────────────

exports.detectAgent = (message) => {
  const lower = message.toLowerCase();
  if (/fire|retire|early retirement|corpus|sip projection/.test(lower)) return 'fire_planner';
  if (/health score|wellness|savings rate|emergency fund score/.test(lower)) return 'health_score';
  if (/tax|80c|80d|form 16|itr|deduction|hra|regime|tds/.test(lower)) return 'tax_wizard';
  if (/mutual fund|mf|xray|x-ray|overlap|xirr|expense ratio|nav|elss fund/.test(lower)) return 'mf_xray';
  if (/bonus|salary hike|job change|marriage|baby|inheritance|life event/.test(lower)) return 'life_event';
  if (/spouse|couple|joint|wife|husband|partner income/.test(lower)) return 'couples_planner';
  return 'orchestrator';
};

// ── Build messages array for LLM ─────────────────────────────────────────────

const buildMessages = (agent, history, userMessage, userProfile) => {
  const systemPrompt = AGENT_PROMPTS[agent] + `\n\nUser financial profile:\n${JSON.stringify(userProfile, null, 2)}`;

  const messages = history.slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));
  messages.push({ role: 'user', content: userMessage });

  return { systemPrompt, messages };
};

// ── Call OpenAI ───────────────────────────────────────────────────────────────

const callOpenAI = async (systemPrompt, messages) => {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  return response.data.choices[0].message.content;
};

// ── Call Anthropic ────────────────────────────────────────────────────────────

const callAnthropic = async (systemPrompt, messages) => {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt + '\n\nAlways respond with valid JSON only, no markdown fences.',
      messages
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  return response.data.content[0].text;
};

// ── Main AI call ──────────────────────────────────────────────────────────────

exports.callAI = async ({ agent, history, userMessage, userProfile }) => {
  const { systemPrompt, messages } = buildMessages(agent, history, userMessage, userProfile);

  let raw;
  if (process.env.AI_PROVIDER === 'anthropic') {
    raw = await callAnthropic(systemPrompt, messages);
  } else {
    raw = await callOpenAI(systemPrompt, messages);
  }

  // Strip potential markdown fences
  const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    logger.warn('AI response was not valid JSON — returning raw text');
    return {
      text: raw,
      richBlocks: [],
      suggestions: [],
      agent
    };
  }
};
