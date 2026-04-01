# The Strategic Project Governance Platform 

A comprehensive full-stack application built to manage tasks, organizations, and team performance with integrated AI governance and strategic surveillance features. Utilizing the MERN stack with an enhanced Python/FastAPI AI microservice and n8n webhook pipelines, this platform actively evaluates task drift and automates project schedule cascading.

## 🚀 Key Features
- **Task & Project Management:** Full Kanban and Gantt chart support, task assignment, sub-tasks, and asset management.
- **AI Governance Judge:** Automatic strategic alignment checks using Google Generative AI to ensure tasks do not drift from the organization's goals.
- **Dynamic Gantt Cascading:** Finish-to-Start predecessor cascading. If a task is delayed, all dependent successors automatically adapt their schedules.
- **Automated n8n Pipelines:** Webhook integration for mitigating delayed tasks, alerting managers of critical bottlenecks, and agent-based automation.
- **Role-Based Access Control:** Distinct Admin and Team Member views. Admins can manage entire organizational workflows.
- **Automated Python AI Microservice:** A FastAPI backend integrating Ollama/Pydantic for deeper project schedule analysis and resolution engines.

## 🛠️ Technology Stack
### Frontend (Client)
- **Framework:** React + Vite
- **Styling:** Tailwind CSS + HeadlessUI
- **State Management:** Redux Toolkit
- **Data Visualization:** Recharts, D3.js (Gantt Charts)
- **Forms & Validation:** React Hook Form
- **Database/Storage:** Supabase (Used for Client-side operations)

### Backend (Server)
- **Environment:** Node.js + Express.js
- **Database:** MongoDB via Mongoose
- **Authentication:** JWT (JSON Web Tokens) with Cookies
- **Security:** Helmet, Express-Rate-Limit, CORS
- **AI Integrations:** Google Generative AI (`@google/generative-ai`)
- **Background Jobs:** Node-cron

### AI Microservice (Python)
- **Framework:** FastAPI + Uvicorn
- **AI Processing:** Ollama, Pydantic

## ⚙️ Installation & Setup

### Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Python 3.9+](https://www.python.org/)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas Cluster)

### 1. Clone the Repository
```bash
git clone <repository_url>
cd <project_directory>
```

### 2. Backend Setup (`/server`)
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory and add the following:
```env
PORT=8800
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# AI & Webhook Integrations
GEMINI_API_KEY=your_google_gemini_api_key
COLAB_JUDGE_URL=http://127.0.0.1:8000/api/evaluate
N8N_SECRET_KEY=your_n8n_secret_key
N8N_WEBHOOK_BASE_URL=your_n8n_webhook_url
N8N_IMPACT_WEBHOOK_URL=your_n8n_impact_webhook
N8N_AGENT_WEBHOOK_URL=your_n8n_agent_webhook
```

Start the backend development server:
```bash
npm run start
```

### 3. Frontend Setup (`/client`)
Navigate to the client directory and install dependencies:
```bash
cd ../client
npm install
```

Create a `.env` file in the `client` directory:
```env
VITE_APP_BASE_URL=http://localhost:8800
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
```

Start the frontend development server:
```bash
npm run dev
```

### 4. AI Microservice Setup (`/ai`)
Navigate to the AI directory and set up a Python virtual environment:
```bash
cd ../ai
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Run the FastAPI server:
```bash
uvicorn gantt_ai:app --reload
```

## 🔒 Security Notes
- Ensure your `.env` variables are never committed to version control.
- For production, ensure `NODE_ENV=production` is set so CORS and cookies operate securely mapping specifically to the `CLIENT_URL`.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!

## 📝 License
This project is proprietary and intended for defined organizational use.
