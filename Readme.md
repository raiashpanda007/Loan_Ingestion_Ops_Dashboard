# 🚀 Challenge 1: Ultra-Fast Loan Ingestion & Live Ops Dashboard

![📊 System Architecture](assets/image.png)  
*Infra Diagram built using Excalidraw*

![📈 Load Testing Results](assets/imagecopy.png)  
*Autocannon Metrics Snapshot*

This is a full-stack, distributed system built as a solution for **CreditSea's Full Stack Intern Challenge**. The project simulates **high-throughput loan ingestion**, real-time processing, WebSocket-based dashboards, error categorization, and operational control tools — all built under **36 hours** from scratch.

---

## 🌪 Challenge Overview

> Build a system capable of ingesting and processing **500+ loan requests/sec**, while tracking performance metrics and error cases in **real-time**.

✅ This project handles **2000+ requests/sec** at **<30ms average latency**, featuring:

- Real-time enriched loan validation pipeline
- WebSocket-powered live dashboard
- Auto-scaling Redis-based workers
- MongoDB batch persistence using cron jobs
- Pause/resume ingestion mechanism
- Load-tested with `autocannon` and `artillery`

---

## 🧱 Architecture (TurboRepo Monorepo)

apps/
├── api/ # REST ingestion API
├── worker/ # Validation + enrichment logic (Redis + Mongo + WS)
├── cron/ # MongoDB batch persistence jobs
├── web/ # Realtime frontend dashboard (Next.js)

yaml
Copy
Edit

---

## 🧠 System Design

### 1. `apps/api` – Ingestion API (Express)
- `POST /api/loans/request`: Accepts one loan request at a time
- Minimal validation, then pushes job into Redis queue
- Supports **pause/resume ingestion** via Redis flag

### 2. `apps/worker` – Dynamic Worker Pool
- Built with `BullMQ` for job processing
- Workers **auto-scale**: 1 per 50 jobs in queue (max 10)
- Validation rules:
  - `creditScore < 600` → `LOW_CREDIT_SCORE`
  - `amount > 5 * income` → `LOAN_TOO_LARGE`
- Valid loans → stored temporarily in Redis
- Invalid loans → stored under Redis namespace `failed-loans:{errorCode}:{jobId}`
- **WebSocket events** emitted on:
  - `success`, `error`, and system stats

### 3. MongoDB Persistence (via Cron Job)
- Cron service scans Redis and pushes:
  - Valid → `Loan` collection
  - Failed → `FailedLoan` + `LoanError` collections (1:n mapping)
- Keeps Redis lean for high-throughput ingestion

### 4. WebSocket + Live Ops Dashboard
- Real-time stats pushed from worker via `ws`
- Frontend dashboard shows:
  - 📊 Ingestion & processing rate charts (Recharts)
  - 📋 Error logs (filterable)
  - ⏸ Pause/resume toggle for API ingestion

---

## ⚙️ Tech Stack

| Layer         | Tech Used                       | Why?                                          |
|---------------|----------------------------------|-----------------------------------------------|
| API Server    | Node.js + Express + Redis        | Low-latency ingestion                          |
| Queue         | Redis + BullMQ                   | Fast, async, auto-scalable jobs               |
| Persistence   | MongoDB (via cron jobs)          | Long-term storage, analytics ready            |
| Frontend      | Next.js + Tailwind + Recharts    | Realtime UI with charts + error logs          |
| Realtime Comm | WebSocket (`ws`)                 | Live push updates to UI                       |
| Monorepo Tool | TurboRepo                        | Shared cache + isolated build pipelines       |

---

## 🚦 API Overview

### ➤ Loan Ingestion
```http
POST /api/loans/request
Content-Type: application/json

{
  "loanId": "LN-123456",
  "application": {
    "name": "Ashwin Rai",
    "age": 24,
    "email": "ashwin@example.com",
    "phone": "9876543210"
  },
  "amount": 50000,
  "income": 15000,
  "creditScore": 550,
  "purpose": "Startup funding"
}
➤ Fetch Error Logs
http
Copy
Edit
GET /api/loans/errors?errorId=<error_id>&loanId=<loanId>&from=2025-06-30&to=2025-07-01
📈 Load Testing Metrics
Metric	Result
Tool Used	autocannon
Concurrency	50 clients
Simulated RPS	2000+ req/sec
Avg Latency	~30ms
Peak RPS	~1800 requests/sec
Error Rate	< 1% (filtered via logic)
Uptime	No drops even at peak throughput

🧠 Dev Notes
Built-in exactly-once semantics using job.id deduplication

Redis used for high-speed ingestion + ephemeral data

MongoDB used only via cron to persist after processing

Web frontend handles WS disconnect + retry gracefully

Infra ready to scale horizontally (workers, dashboard)

🛠 Setup Instructions
Prerequisites
Node.js v18+

Redis (locally or remote)

MongoDB (prefer Atlas, not local Mongo — index issues on local)

Install

pnpm install
Build Each App (individually)

cd apps/api && pnpm tsbuild
cd apps/worker && pnpm tsbuild
cd apps/cron && pnpm tsbuild
cd apps/web && pnpm tsbuild
Run All Services

pnpm dev
🌱 Environment Setup
Create a .env file in the root, based on .env.example:


REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb+srv://<your-mongodb-atlas-uri>
PORT=3000
WS_PORT=8080
WS_URL=ws://localhost:8080
...
📂 Future Enhancements (Optional)
Authentication layer (JWT/session)

Redis TTL & DLQ (dead-letter queues)

GitHub Actions CI/CD

Redis alerts (e.g. for error spikes)

GraphQL API layer

🙇 Author
Ashwin Rai
Full-stack Developer | IIIT Bhagalpur
GitHub: raiashpanda007