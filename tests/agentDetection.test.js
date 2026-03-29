const { detectAgent } = require('../src/services/aiService');

describe('AI Agent Detection', () => {
  const cases = [
    ['Help me retire early at 45', 'fire_planner'],
    ['Calculate my FIRE corpus', 'fire_planner'],
    ['SIP projection for 20 years', 'fire_planner'],
    ['What is my money health score', 'health_score'],
    ['Analyse my savings rate', 'health_score'],
    ['How much tax should I pay', 'tax_wizard'],
    ['Explain 80C deductions', 'tax_wizard'],
    ['Form 16 analysis', 'tax_wizard'],
    ['Old vs new tax regime', 'tax_wizard'],
    ['Analyse my mutual fund portfolio', 'mf_xray'],
    ['Check XIRR on my SIPs', 'mf_xray'],
    ['Fund overlap in my portfolio', 'mf_xray'],
    ['I got a bonus of 2 lakhs', 'life_event'],
    ['Salary hike received, how to invest', 'life_event'],
    ['Planning for marriage', 'life_event'],
    ['Joint financial planning with spouse', 'couples_planner'],
    ['My wife earns 80000 per month', 'couples_planner'],
    ['Hello there', 'orchestrator'],
    ['What can you do', 'orchestrator'],
  ];

  test.each(cases)('"%s" → %s', (message, expected) => {
    expect(detectAgent(message)).toBe(expected);
  });
});
