# AI-Powered Full-Stack RAG System 🛡️

A production-ready document analysis platform built with a focus on **Data Privacy (PII Protection)**, **Scalability (Event-Driven)**, and **Multimodal AI**.

![Status](https://img.shields.io/badge/Status-Production_Ready-success)
![Security](https://img.shields.io/badge/Security-PII_Redaction-blue)
![Stack](https://img.shields.io/badge/Tech-Next.js_|_Node_|_Python-black)

---

## 🚀 Key Features

- **Multimodal Ingestion:** Supports PDF, Images (OCR), TXT, Markdown, and Code files.
- **Privacy-First Architecture:** Integrated **Microsoft Presidio** to detect and redact Sensitive Data (PII) *before* it touches the Vector Database or LLM context.
- **Event-Driven Backend:** Uses **BullMQ (Redis)** to handle heavy AI workloads asynchronously, preventing HTTP timeouts.
- **Provider Agnostic:** Implements the *Adapter Pattern* to switch between Gemini, OpenAI, or Mock models via environment variables.
- **Vector Search:** Utilizes **PostgreSQL + pgvector** for semantic retrieval (RAG).

---

## 🏗️ Architecture & Decisions

### 1. The "Safety Shield" Pattern (PII Handling)
Security is not an afterthought. The pipeline enforces a strict **"Clean before Store"** policy:
1. **Ingestion:** File is read into a temporary buffer.
2. **Extraction:** AI extracts raw text (and performs OCR on images).
3. **Interception:** `PiiService` scans text for Credit Cards, Phones, Emails, and Names using NLP models (Microsoft Presidio).
4. **Redaction:** Sensitive entities are replaced with tokens (e.g., `<REDACTED>`, `<PERSON>`).
5. **Storage:** Only the sanitized text is embedded and stored.

> **Trade-off:** Adds latency (~500ms) per document but ensures GDPR/Compliance.

### 2. Asynchronous Processing
AI inference is slow and bursty. Instead of blocking the REST API:
- Users receive a `jobId` immediately upon upload.
- Workers process documents in the background (concurrency controlled via Redis).
- WebSockets (or polling) update the UI state.

> **Benefit:** The system remains responsive even under heavy load (10k+ requests).

### 3. Authentication & Security
- **JWT Authentication:** The system uses JWT-based authentication (Clerk/NextAuth) to associate documents and queries with a specific user context.
- **Prompt Injection Mitigation:** User inputs are never interpolated directly into system instructions. All user content is passed as bounded context blocks after sanitization. The assistant is strictly instructed to ignore instructions not present in the retrieved context.

---

## ☁️ Infrastructure & Deployment

### Infrastructure as Code (IaC)
Infrastructure is defined using **Terraform** (see `/infra` folder) to provision a production-grade environment on AWS:
- **Compute:** AWS ECS (Fargate) for serverless container orchestration.
- **Database:** AWS RDS (PostgreSQL) with `pgvector` extension enabled.
- **Cache:** AWS ElastiCache (Redis) for job queues.
- **Networking:** VPC with private subnets for DB/Redis security.

### Containerization
The backend is Dockerized using a **Multi-Stage Build** (see `backend/Dockerfile`) to ensure a lightweight production image (Alpine Linux), stripping out dev dependencies and optimizing Prisma binary usage.

### Secrets Management
In production, AI API keys and Database credentials are strictly stored in **AWS Secrets Manager** and injected into the ECS tasks at runtime. Key rotation is handled by updating the secret version, requiring no code changes.

---

## 🧪 Data Retention & Auditability

- **Raw Files:** Ephemeral. Deleted from memory immediately after processing.
- **Vector Data:** Retained until user deletion request.
- **Audit Logs:** All critical actions (upload, PII redaction events, queries) are logged to the `AuditLog` table for compliance tracking.
- **PII:** Never stored at rest.

---

## 🎨 Frontend UX Considerations

The UI is built with React and TailwindCSS (Glassmorphism design), specifically tailored for AI interactions:
- **State Management:** Explicitly handles Loading, Processing, Error, and Empty states.
- **Feedback Loop:** Allows users to refine or re-ask questions over the same document context.
- **Transparency:** Visualizes the "Thinking" process and PII redaction status.

---

## 🛠️ Tech Stack

- **Frontend:** React, TailwindCSS, Lucide Icons.
- **Backend:** Node.js, Express, TypeScript.
- **AI Core:** Google Gemini 3 Flash Preview (Multimodal), `text-embedding-004`.
- **Security:** Microsoft Presidio (Analyzer + Anonymizer).
- **Database:** PostgreSQL (Prisma ORM + pgvector).
- **Queue:** Redis + BullMQ.

---

## 💰 Cost Estimation (Bonus)

Estimations based on projected pricing for **Google Gemini 3 Flash Preview** (High-efficiency tier) and standard AWS Infrastructure costs.

> **Note on Model Pricing:** While "Preview" models are often free during the experimental phase, this calculation projects costs using standard "Flash" tier commercial rates ($0.075/1M Input Tokens) to demonstrate long-term business viability.

**Assumptions per Request:**
* **Input:** ~2,500 tokens (RAG Context + Chat History + User Prompt).
* **Output:** ~500 tokens (AI Generated Response).
* **Vector Ops:** Included in DB costs.

| Volume (Requests/mo) | AI API Cost (Gemini 3 Flash) | Infrastructure (AWS Fargate + RDS) | Total Est. Cost |
| :--- | :--- | :--- | :--- |
| **1,000** | ~$0.35 | ~$60.00 (Baseline) | **~$60.35** |
| **10,000** | ~$3.50 | ~$75.00 (Auto-scaling) | **~$78.50** |
| **100,000** | ~$35.00 | ~$120.00 (Larger DB + Replicas) | **~$155.00** |

### 📉 Cost Efficiency Strategy
We chose **Gemini 3 Flash** not just for its multimodal capabilities, but for its **unit economics**. Even with a massive context window, the Flash tier remains ~10x cheaper than comparable "Pro" models, allowing for heavy document processing at scale.

---

## ⚖️ Trade-offs & Limitations

1. **Presidio Latency:** Running PII detection on every chunk adds overhead. For high-throughput systems (>100 RPS), we would move PII detection to a separate, auto-scaling microservice fleet.
2. **Postgres vs. Pinecone:** Used Postgres (`pgvector`) to keep the stack simple and relational data unified. For >10M vectors, migration to a dedicated vector DB (Pinecone/Milvus) would be necessary.
3. **Accuracy vs. Privacy:** Aggressive PII redaction (Score Threshold 0.3) might occasionally hide non-sensitive names. We prioritize safety over 100% context retention.

---

## ⚙️ Setup & Installation

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Gemini API Key

### 1. Environment Variables
Create a `.env` file in `backend/`:

```bash
DATABASE_URL="postgresql://admin:password123@localhost:5432/ai_assessment_db?schema=public"

JWT_SECRET="super-secret-ai-key-2026"

PORT=3000

REDIS_HOST=localhost
REDIS_PORT=6379

GEMINI_API_KEY="..."

PRESIDIO_ANALYZER_URL=http://presidio-analyzer:5001
PRESIDIO_ANONYMIZER_URL=http://presidio-anonymizer:5002

```

### 2. Run Infrastructure & Backend (Docker)

Start Postgres, Redis, Presidio, and the Node.js Backend:

```bash
docker-compose up --build

```

### 3. Start Frontend (Local)

Since frontend dockerization is optional, run it locally for better DX:

```bash
cd frontend
npm install
npm run dev

```

Visit `http://localhost:5173` to start.

---

## 👤 Author

**Matías Rodríguez Cárdenas**
*Specialized in Data Engineering & Generative AI Systems.*
