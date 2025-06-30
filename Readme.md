# Challenge 1: Ultra-Fast Loan Ingestion & Live Ops Dashboard

![alt text](assets/image.png)

This project is a monorepo solution to **Challenge 1** of CreditSea's Full Stack Intern Challenge:  
**Ultra-Fast Loan Ingestion & Live Ops Dashboard**

Built to handle **500+ loan requests/second**, validate/enrich the data, and stream real-time metrics to a live dashboard — with exactly-once processing, retry flow, and operational controls. Includes **auto-scaling workers** that dynamically adjust based on queue load, ensuring stability under sudden burst loads.

Custom failure categories like `low-credit-score`, `invalid-data`, and `loan-too-large` are used since the challenge didn't specify exact failure modes. These were manually designed to force rejections during stress tests and provide meaningful grouping for retry logic and analysis.

---

## 🧱 Monorepo Structure (TurboRepo)

```
apps/
├── api/     # REST API server (ingestion entrypoint, Redis push)
├── worker/  # Worker service (validation, Redis/Mongo write, WebSocket emit)
├── web/     # Realtime frontend dashboard (Next.js)
```

---

## 📦 Tech Stack

| Layer         | Technology              | Why Used |
|---------------|--------------------------|----------|
| API Server    | Node.js + Express + Redis | Fast ingestion and async queuing |
| Workers       | Node.js + Redis          | Pull jobs, validate, enrich, store fast |
| Frontend      | Next.js + TypeScript     | Full-stack React, built-in SSR |
| Queue         | Redis                    | In-memory async queue, high-throughput |
| Database      | MongoDB (via cron jobs)  | Persistent storage after enrichment |
| Realtime Comm | WebSocket (ws)           | Push live metrics and status updates |
| Infra         | TurboRepo                | Code separation, DX improvement, dev speed |

---

## 🚦 Backend Workflow

### ➤ 1. `apps/api`: Ingestion Service (REST)
- Endpoint: `POST /api/loans/request`
- Accepts **1 loan JSON per request**
- Validates minimal fields and **pushes to Redis queue**
- Supports pause/resume logic via in-memory flag or Redis key
- Handles burst requests efficiently

### ➤ 2. `apps/worker`: Processing Workers
- Subscribes to the Redis loan queue
- Dynamically scales workers based on queue size (1 per 50 jobs, up to 5 max)
- Each worker validates & enriches the loan data:
  - Required fields:
    ```json
    {
      "loanId": "string",
      "application": {
        "name": "string",
        "age": 18,
        "email": "example@example.com",
        "phone": "1234567890"
      },
      "amount": 5000,
      "income": 1000,
      "creditScore": 650,
      "purpose": "Home renovation"
    }
    ```
- Custom validations added for failure simulation during server bombardment:
  - ❌ If `creditScore < 600` → `low-credit-score`
  - ❌ If `amount > 5 * income` → `loan-too-large`
- Based on result:
  - ✅ Valid → temporarily stored in Redis for persistence cron
  - ❌ Invalid → stored in Redis `failedLoans` queue and emitted via WebSocket
- Sends **real-time updates** to the dashboard:
  - Processing rate
  - Success/failure counts
  - Errors per applicant / type

---

## 🔁 Retry & Failure Handling

- Failed loans are stored in Redis under categorized keys like `failed-jobs:low-credit-score`
- Retry support via `PATCH /api/loans/retry`
- Cron job will persist accepted and failed logs to MongoDB
- Searchable error tagging by `applicant`, `type`, and `timestamp`

---

## 📊 Dashboard Overview (`apps/web`)

- Realtime line charts: Ingestion vs. Processed rates
- Filterable error logs: by `loanId`, `errorType`, `timestamp`
- Admin controls:
  - ⏸ Pause / ▶️ Resume ingestion
  - 🔁 Retry failed loans
- Handles WebSocket reconnect gracefully
- React UI with Tailwind + Recharts

---

## ⚙️ Status

| Feature                            | Status     |
|-----------------------------------|------------|
| TurboRepo Monorepo Setup          | ✅ Done     |
| Loan Ingestion API (REST)         | ✅ Done     |
| Redis Queue Integration           | ✅ Done     |
| Worker Service & WS Integration   | ✅ Done     |
| Auto-Scaling Workers              | ✅ Done     |
| MongoDB Logging (Cron Job)        | ⏳ In Progress |
| Realtime Dashboard (WebSocket)    | ⏳ In Progress |
| Error Log API + Filters           | ⏳ In Progress |
| Retry & Pause Controls            | ⏳ In Progress |

---

> 🧠 This is being built from scratch under a 36-hour time limit. This README will evolve as features are completed
