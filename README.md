# ⚡ TRACE — AI-Powered Workspace Automation

> **Silent Workflow Observation, Friction Analytics, and Autonomous Browser Execution**

TRACE observes everyday desktop tasks, detects repetitive patterns and friction points, leverages Google Gemini AI to plan deterministic workflows, and autonomously executes automations using Playwright.

---

## 🏛️ Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │                    USER WORKSTATION                    │
 │                                                        │
 │   ┌──────────────────────┐    ┌────────────────────┐   │
 │   │  TRACE Desktop App   │    │   Python Desktop   │   │
 │   │    (React + Vite)    │    │      Observer      │   │
 │   └──────────┬───────────┘    └─────────┬──────────┘   │
 └──────────────┼──────────────────────────┼──────────────┘
                │ REST / WebSocket         │ Socket.IO (Events)
                ▼                          ▼
 ┌────────────────────────────────────────────────────────┐
 │                   TRACE CLOUD BACKEND                  │
 │                 (Node.js + Express + WS)               │
 │                                                        │
 │   ├── REST API & Real-time Socket.IO Gateway           │
 │   ├── Pattern Detection & Behavioral Analytics         │
 │   ├── Playwright Browser Execution Engine              │
 │   └── Storage Layer (In-Memory / Firestore Cloud)      │
 └──────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        ▼
 ┌────────────────────────────────────────────────────────┐
 │                   GOOGLE GEMINI AI                     │
 │          Semantic Workflow Analysis & Planning         │
 └────────────────────────────────────────────────────────┘
```

### Component Roles
1. **Frontend (`/frontend`)**: Responsive, high-performance UI (React 19, Tailwind CSS, Recharts) providing real-time dashboard analytics, session observation controls, workflow visualization, approval checkpoints, and live Playwright execution tracking.
2. **Backend (`/backend`)**: Express.js & Socket.IO server powering event aggregation, workflow pattern clustering, Google Gemini AI analysis, and autonomous Playwright automation.
3. **Desktop Observer (`/observer`)**: Lightweight Python client running locally on the user's workstation using `pynput` and `win32gui` to capture user actions across desktop apps and emit telemetry to the backend.

---

## ⚡ TRACE Showcase Architecture

The project includes a robust **TRACE Showcase** layer demonstrating local, non-web automations (Excel, PDF extraction, File Recovery) without external dependencies.

- **Execution Router (`execution.service.ts`)**: Routes specialized actions (`OPEN_EXCEL`, `FIND_FILE`, `READ_PDF`) to dedicated local executors while maintaining the standard Playwright loop for web actions.
- **Python COM Executor (`excel_executor.py`)**: Uses `win32com.client` to physically open and interact with Microsoft Excel on the host machine, performing visible macro-style interactions.
- **Demo Workspace Generator (`showcase.service.ts`)**: Automatically scaffolds an isolated `TRACE Demo Workspace` at the root directory upon server start, pre-filling it with sample data (Excel files, PDFs, Support Tickets) to ensure demo executions never corrupt real user data.
- **Self-Healing Fallbacks**: Demonstrates AI self-healing by allowing a target PDF (`Invoice_1042.pdf`) to be arbitrarily moved within the workspace, triggering a dynamic recursive file search and recovery step during execution.

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Python**: v3.10 or higher (Windows recommended for native desktop window inspection)
- **Google Gemini API Key**: [Get a Gemini API key](https://aistudio.google.com/) *(optional — deterministic fallback available if omitted)*

---

## ⚙️ Environment Variables

### 1. Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Default (Local) |
|---|---|---|
| `PORT` | Server listening port | `3001` |
| `CLIENT_URL` | Allowed frontend client URL for CORS | `http://localhost:5173` |
| `SOCKET_CORS_ORIGIN` | Allowed Socket.IO origin (comma-separated or single URL) | `http://localhost:5173` |
| `GEMINI_API_KEY` | Google Gemini API key | *(Optional)* |
| `FIREBASE_SERVICE_ACCOUNT` | JSON string or path to Firebase service account | *(Optional)* |
| `PLAYWRIGHT_HEADLESS` | Force headless browser execution (`true`/`false`) | `false` (local), `true` (prod) |

### 2. Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```

| Variable | Description | Default (Local) |
|---|---|---|
| `VITE_API_URL` | TRACE backend REST API base URL | `http://localhost:3001` |
| `VITE_SOCKET_URL` | TRACE backend Socket.IO base URL | `http://localhost:3001` |

### 3. Python Observer (`observer/.env`)
Copy `observer/.env.example` to `observer/.env`:
```bash
cp observer/.env.example observer/.env
```

| Variable | Description | Default (Local) |
|---|---|---|
| `SOCKET_SERVER_URL` | Target TRACE backend URL for telemetry | `http://localhost:3001` |

---

## 🚀 Local Development Setup

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install
npx playwright install chromium

# Install frontend dependencies
cd ../frontend
npm install

# Install observer dependencies in a virtual environment
cd ../observer
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Run the Services

Open **three terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
*Backend runs on `http://localhost:3001`*

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`*

**Terminal 3 — Observer:**
```bash
cd observer
# Ensure virtual environment is activated
python main.py
```
*Observer connects to `http://localhost:3001` and awaits observation start.*

---

## 🌐 Production Deployment

TRACE is designed for straightforward cloud deployment with a separated desktop agent:

| Component | Target Hosting | Notes |
|---|---|---|
| **Backend & Playwright** | [Railway](https://railway.app) / [Render](https://render.com) | Node.js container with Chromium support |
| **Frontend** | [Vercel](https://vercel.com) / [Railway](https://railway.app) | Static SPA deployment |
| **Observer** | **User's Local Machine** | Runs on workstation to observe desktop apps |

### 1. Deploy Backend (e.g. Railway / Render)

1. Connect your GitHub repository to Railway.
2. Select the `/backend` subdirectory as the root directory.
3. Configure build and start commands:
   - **Build Command**: `npm install && npx playwright install --with-deps chromium`
   - **Start Command**: `npm start`
4. Set Environment Variables in the cloud dashboard:
   - `PORT`: (Auto-assigned by host, e.g. `3001` or `8080`)
   - `CLIENT_URL`: `https://your-trace-frontend.vercel.app`
   - `SOCKET_CORS_ORIGIN`: `https://your-trace-frontend.vercel.app`
   - `GEMINI_API_KEY`: `your_gemini_api_key`
   - `PLAYWRIGHT_HEADLESS`: `true`
5. Verify deployment:
   - Health check: `GET https://your-trace-backend.up.railway.app/health`
   - Response: `{"status":"ok","service":"trace"}`

### 2. Deploy Frontend (e.g. Vercel)

1. Import the repository on Vercel.
2. Set the Root Directory to `frontend`.
3. Set Environment Variables in Vercel project settings:
   - `VITE_API_URL`: `https://your-trace-backend.up.railway.app`
   - `VITE_SOCKET_URL`: `https://your-trace-backend.up.railway.app`
4. Deploy. Vercel automatically detects Vite and uses the included `vercel.json` rewrite configuration for seamless SPA routing.

### 3. Run Observer on User Machine

The observer **must run locally on the client's PC** because browser/server sandboxes cannot capture system-wide operating system mouse/keyboard events.

1. Configure `observer/.env`:
   ```env
   SOCKET_SERVER_URL=https://your-trace-backend.up.railway.app
   ```
   *(Or pass the URL as a CLI argument: `python main.py https://your-trace-backend.up.railway.app`)*
2. Run:
   ```bash
   python main.py
   ```
3. Open your deployed TRACE web app, click **Start Observing** on the Activity or Dashboard page, and work normally!

---

## 🛠️ Verification & Health Check

The backend includes a health endpoint for automated uptime monitoring and container probes:

```http
GET /health
```
Response:
```json
{
  "status": "ok",
  "service": "trace"
}
```

---

## 🛡️ Security & Privacy

- **No Secrets in Repo**: All API keys, service accounts, and database credentials are managed exclusively through environment variables.
- **CORS Protection**: Explicit origin validation on both Express HTTP endpoints and Socket.IO connections.
- **Configurable Persistence**: Zero-configuration local development storage with optional Firestore enterprise encryption.

---

## 📄 License

Distributed under the MIT License.
