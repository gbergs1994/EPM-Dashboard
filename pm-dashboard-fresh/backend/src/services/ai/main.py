from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InsightRequest(BaseModel):
    project_summary: str

@app.post("/insights")
async def get_insights(request: InsightRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an AI project analyst. Provide concise insights and recommendations based on project summaries.",
                },
                {
                    "role": "user",
                    "content": request.project_summary,
                },
            ],
        )
        return {
            "insight": response.choices[0].message.content.strip()
        }
    except Exception as e:
        return {"error": str(e)}
