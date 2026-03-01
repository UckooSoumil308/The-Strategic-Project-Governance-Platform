from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama
import json
import os
import requests
from dotenv import load_dotenv

# Load the environment variables from the server's .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'server', '.env')
load_dotenv(dotenv_path)

# Initialize the remote Ngrok Colab URL
colab_url = os.getenv("COLAB_JUDGE_URL", "http://localhost:8000")
print(f"Initializing remote FastAPI via: {colab_url}")

app = FastAPI(title="Llama 3.2 Gantt Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 1. Input Schemas ──────────────────────────────────────────
class GanttRequest(BaseModel):
    project_description: str

class dictParams(BaseModel):
    # Depending on how the frontend sends it, it may just be "current_schedule: dict"
    pass

class RefineRequest(BaseModel):
    current_schedule: list
    user_instructions: str

# ── 2. Structured Output Pydantic Models ──────────────────────
# These define the exact JSON shape Ollama must return
class GeneratedTask(BaseModel):
    title: str
    description: str
    estimated_duration_days: int
    is_milestone: bool
    logical_predecessors: list[int]

class ProjectSchedule(BaseModel):
    tasks: list[GeneratedTask]


class GanttResponse(BaseModel):
    wbs: list[dict]
    message: str

# ── 3. Prompt Template ────────────────────────────────────────
prompt_template = """
You are an expert MERN-stack and D3.js senior project architect.
Your job is to read a project description and output a strict, properly formatted Work Breakdown Structure (WBS).

Deconstruct the following project into logical, sequential tasks. 
- Ensure durations are realistic (in days).
- Set `is_milestone` to true for major delivery points (duration should usually be 1 or 0 for milestones).
- Use `logical_predecessors` to establish Finish-to-Start dependencies. For example, if Task 2 depends on Task 0 and Task 1, its predecessors should be [0, 1] (0-indexed based on the generated array).

Project Description:
{description}
"""

# ── 4. Endpoints ──────────────────────────────────────────────
@app.post("/api/ai/generate-schedule", response_model=GanttResponse)
def generate_schedule(request: GanttRequest):
    print(f"Received request for project: {request.project_description[:50]}...")
    try:
        print(f"Contacting remote Colab FastAPI via {colab_url}/api/ai/generate-schedule...")
        
        # We need to bypass the ngrok warning if it's a free tier tunnel
        headers = {
            "ngrok-skip-browser-warning": "69420",
            "Content-Type": "application/json"
        }
        
        # The Colab notebook exposes /api/ai/generate-schedule directly!
        res = requests.post(
            f"{colab_url}/api/ai/generate-schedule",
            headers=headers,
            json={"project_description": request.project_description},
            timeout=120
        )
        
        res.raise_for_status()
        raw_content = res.json()
        
        # We know the colab endpoint returns a valid ProjectSchedule JSON
        parsed_schedule = ProjectSchedule.model_validate(raw_content)
        print("Colab FastAPI response successfully parsed into Pydantic models.")
        
        # Convert back to standard dicts for the generic FastAPI response
        wbs_dicts = [task.model_dump() for task in parsed_schedule.tasks]
        
        print(f"Returning {len(wbs_dicts)} generated tasks to frontend!")
        return {
            "wbs": wbs_dicts,
            "message": "AI Schedule generated successfully."
        }
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse LLM JSON: {e}")
        raise HTTPException(status_code=500, detail="AI output could not be parsed as valid JSON.")
    except Exception as e:
        print(f"Ollama/Pydantic Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/refine-schedule", response_model=GanttResponse)
def refine_schedule(request: RefineRequest):
    print(f"Received refine request...")
    try:
        print(f"Contacting remote Colab FastAPI via {colab_url}/api/ai/refine-schedule...")
        
        headers = {
            "ngrok-skip-browser-warning": "69420",
            "Content-Type": "application/json"
        }
        
        res = requests.post(
            f"{colab_url}/api/ai/refine-schedule",
            headers=headers,
            json={
                "current_schedule": {"tasks": request.current_schedule},
                "user_instructions": request.user_instructions
            },
            timeout=120
        )
        
        res.raise_for_status()
        raw_content = res.json()
        
        # Validate the response from colab into ProjectSchedule
        parsed_schedule = ProjectSchedule.model_validate(raw_content)
        
        print("Colab FastAPI response successfully parsed into Pydantic models.")
        wbs_dicts = [task.model_dump() for task in parsed_schedule.tasks]
        
        return {
            "wbs": wbs_dicts,
            "message": "AI Schedule refined successfully."
        }
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse LLM JSON: {e}")
        raise HTTPException(status_code=500, detail="AI output could not be parsed as valid JSON.")
    except Exception as e:
        print(f"Ollama/Pydantic Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
