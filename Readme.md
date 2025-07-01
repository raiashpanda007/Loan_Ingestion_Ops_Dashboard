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
- Retry and pause/resume mechanisms
- Load-tested with `autocannon` and `artillery`

---

## 🧱 Architecture (TurboRepo Monorepo)

apps/
├── api/ → REST ingestion API
├── worker/ → Validation + enrichment logic (Redis + Mongo + WS)
├── web/ → Realtime frontend dashboard (Next.js)



---

## 🧠 System Design

### 1. `apps/api` – Ingestion API (Express)
- `POST /api/loan/request`: Accepts one loan request at a time
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
- Batch inserts from Redis every few minutes
- Accepted → `Loan` collection
- Failed → `FailedLoan` & `LoanError` collections (1:n)

### 4. WebSocket + Live Ops Dashboard
- WebSocket server emits:
  - Ingestion rate, error types, job success/fail count
- Frontend dashboard (`apps/web`) shows:
  - 📊 Live line charts (Recharts)
  - 📋 Error logs (filterable, retryable)
  - ⏸ Pause/Resume toggle
  - 🔁 Retry API to resubmit failed requests

---

## ⚙️ Tech Stack

| Layer         | Tech Used                       | Reason                                       |
|---------------|----------------------------------|----------------------------------------------|
| API Server    | Node.js + Express + Redis        | Low-latency ingestion                        |
| Worker Engine | Node.js + BullMQ                 | Scalable async job queue                     |
| Persistence   | MongoDB (via cron jobs)          | Fast writes with bulk insert                 |
| Frontend      | Next.js + Tailwind + Recharts    | Full-stack rendering, realtime UI            |
| Realtime Comm | WebSocket (`ws` package)         | Instant frontend updates                     |
| Infra         | TurboRepo                        | Fast monorepo DX with caching & sharing      |

---

## 🚦 API Overview

### ➤ Loan Request
```http
POST /api/loan/request
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
➤ Retry Failed Loans

POST /api/loan/request
➤ Fetch Error Logs

GET /api/loans/errors?errorId=<error_id>&loanId=<loanId>&from=2025-06-30&to=2025-07-01
🚀 Load Test Metrics
Tool: autocannon

Concurrency: 50 clients

Simulated Load: 2000+ req/sec

Avg Latency: ~30ms

Peak RPS: ~2000

Error Rate: < 1%

Throughput: Consistent 1.5k–2k req/sec across duration

🧠 Advanced Notes
Built-in exactly-once semantics by using job.id as deduplication key

Redis used for fast ingestion and short-term job state

MongoDB used for long-term analytics

Frontend handles WS disconnects and automatically retries

Workers publish their status, allowing future scale to K8s or ECS

📂 Remaining Enhancements (Optional)
Add authentication (JWT or session)

Introduce Redis TTLs and DLQs (dead-letter queues)

CI/CD pipeline (GitHub Actions + Docker + Railway/Vercel)

Alerting system for error spikes (email/webhook)

GraphQL API (stretch)

🙇‍♂️ Author
Ashwin Rai
Full-stack Developer | IIIT Bhagalpur