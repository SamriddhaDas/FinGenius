# FinGenius

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens) |
| AI | OpenAI GPT-4o or Anthropic Claude |
| File upload | Multer + pdf-parse |
| Validation | express-validator |
| Security | Helmet, CORS, rate-limit |
| Logging | Winston |
| Testing | Jest + Supertest |

---

## Project Structure

```
fingenius/
├── frontend.html/
├── src/
│   ├── index.js                   # Entry point
│   ├── app.js                     # Express app + middleware
│   ├── config/
│   │   └── database.js            # MongoDB connection
│   ├── models/
│   │   ├── User.js                # User + financial profile
│   │   ├── Conversation.js        # Chat history
│   │   ├── Portfolio.js           # MF holdings
│   │   ├── Goal.js                # Financial goals
│   │   └── TaxAnalysis.js         # Tax records
│   ├── routes/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── chat.js
│   │   ├── dashboard.js
│   │   ├── portfolio.js
│   │   ├── tax.js
│   │   ├── goals.js
│   │   ├── healthScore.js
│   │   └── upload.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── chatController.js
│   │   ├── dashboardController.js
│   │   ├── portfolioController.js
│   │   ├── taxController.js
│   │   ├── goalController.js
│   │   └── uploadController.js
│   ├── services/
│   │   ├── aiService.js           # LLM routing + agent prompts
│   │   ├── healthScoreService.js  # 6-dimension score engine
│   │   ├── taxService.js          # Old vs new regime calculator
│   │   └── financialCalcService.js # SIP, FIRE, XIRR, EMI
│   ├── middleware/
│   │   ├── auth.js                # JWT protect middleware
│   │   ├── validate.js            # express-validator helper
│   │   └── upload.js              # Multer config
│   └── utils/
│       └── logger.js              # Winston logger
├── tests/
│   ├── financialCalc.test.js
│   ├── taxService.test.js
│   ├── healthScore.test.js
│   └── agentDetection.test.js
├── .env.example
├── jest.config.json
└── package.json
```


## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT + refresh token |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |
| GET | `/api/auth/me` | Get current user |

### User
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/user/profile` | Get full profile |
| PATCH | `/api/user/profile` | Update profile / financial data |
| POST | `/api/user/onboarding` | Complete onboarding questionnaire |

### Chat (AI)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/message` | Send message → AI responds |
| GET | `/api/chat/conversations` | List all conversations |
| GET | `/api/chat/conversations/:id` | Get full conversation |
| DELETE | `/api/chat/conversations/:id` | Delete conversation |

**POST `/api/chat/message` body:**
```json
{
  "message": "Help me plan for early retirement at 45",
  "conversationId": "optional-existing-id"
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "...",
  "message": {
    "role": "assistant",
    "content": "...",
    "agent": "fire_planner",
    "richBlocks": [...],
    "suggestions": [...]
  }
}
```

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Aggregated financial overview |

### Portfolio (MF X-Ray)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/portfolio` | Get all holdings |
| POST | `/api/portfolio/holdings` | Add a fund holding |
| PATCH | `/api/portfolio/holdings/:id` | Update holding NAV/value |
| DELETE | `/api/portfolio/holdings/:id` | Remove holding |
| POST | `/api/portfolio/xray` | Run full X-Ray analysis |

### Tax
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/tax/analyse` | Compute old vs new regime |
| GET | `/api/tax/history` | Past tax analyses |

**POST `/api/tax/analyse` body:**
```json
{
  "financialYear": "2024-25",
  "grossSalary": 1200000,
  "deduction80C": 120000,
  "deduction80D": 25000,
  "deduction80CCD1B": 50000,
  "deductionHRA": 180000
}
```

### Goals
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/goals` | List goals with projections |
| POST | `/api/goals` | Create goal |
| PATCH | `/api/goals/:id` | Update goal |
| DELETE | `/api/goals/:id` | Delete goal |
| GET | `/api/goals/:id/project` | Year-by-year projection |

### Money Health Score
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health-score` | Calculate + return 6-dim scores |

### Upload
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload/form16` | Upload Form 16 PDF for auto-extraction |

---

## AI Agent Routing

The `aiService.js` automatically routes each chat message to the correct specialist agent:

| Agent | Triggers |
|---|---|
| `fire_planner` | retire, FIRE, corpus, SIP projection |
| `health_score` | health score, savings rate, emergency fund score |
| `tax_wizard` | tax, 80C, 80D, Form 16, ITR, regime, TDS |
| `mf_xray` | mutual fund, MF, XIRR, overlap, expense ratio |
| `life_event` | bonus, salary hike, job change, marriage, baby |
| `couples_planner` | spouse, couple, joint, wife/husband income |
| `orchestrator` | everything else |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default 5000) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | Token expiry (default `7d`) |
| `AI_PROVIDER` | No | `openai` or `anthropic` (default openai) |
| `OPENAI_API_KEY` | If using OpenAI | GPT-4o key |
| `ANTHROPIC_API_KEY` | If using Anthropic | Claude key |
| `UPLOAD_DIR` | No | Upload directory (default `./uploads`) |
| `MAX_FILE_SIZE_MB` | No | Max upload size (default 10) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |

---

## Security Notes

- Passwords hashed with **bcrypt** (12 rounds)
- JWT access tokens expire in **7 days**; refresh tokens in **30 days**
- Refresh tokens are stored hashed in DB and invalidated on logout
- Auth endpoints rate-limited to **10 req / 15 min**
- Chat endpoint rate-limited to **20 messages / min**
- Helmet sets secure HTTP headers
- Uploaded files deleted from disk after PDF parsing

## License
MIT
