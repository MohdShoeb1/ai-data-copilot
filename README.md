# 🤖 AI Data Analyst Copilot

## Folder Structure
```
copilot/
├── backend/     → FastAPI server (Python)
└── frontend/    → React app (browser)
```

## STEP 1: Backend Setup
```
cd backend
pip install -r requirements.txt
```
Edit .env file → add your GROQ_API_KEY
```
uvicorn main:app --reload --port 8000
```

## STEP 2: Frontend Setup (new terminal)
```
cd frontend
npm install
npm run dev
```

## STEP 3: Open Browser
Go to: http://localhost:3000

## Get Free Groq API Key
https://console.groq.com (free, takes 1 min)
