# ⚙️ Setup & Installation (Local)

This guide provides the steps to deploy and run the application on your local machine.

## Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Gemini API Key

## 1. Environment Variables
Create a `.env` file in the `backend/` directory with the following content:

```bash
DATABASE_URL="postgresql://admin:password123@postgres:5432/ai_assessment_db"
JWT_SECRET="super-secret-ai-key-2026"
PORT=8000
GEMINI_API_KEY="your_api_key_here"
GEMINI_MODEL_NAME="gemini-3.0-flash-preview"
REDIS_HOST="redis"
PRESIDIO_ANALYZER_URL="http://presidio-analyzer:3000"
PRESIDIO_ANONYMIZER_URL="http://presidio-anonymizer:3000"
AI_PROVIDER="GEMINI"
```

**Note:** Replace `"your_api_key_here"` with your actual Gemini API key.

## 2. Run Infrastructure & Backend (Docker)

This command will start all the necessary services, including the database, Redis, and the backend server.

```bash
docker-compose up --build
```

The backend will be available at `http://localhost:8000`.

## 3. Start Frontend (Local)

For a better development experience, run the frontend locally:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.