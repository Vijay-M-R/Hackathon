import os
from google import genai
from typing import List, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json

load_dotenv()

class QuestionInfo(BaseModel):
    question_text: Optional[str] = ""
    answer: Optional[str] = ""
    options: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    difficulty: Optional[str] = "Medium"
    type: Optional[str] = "MCQ"

    suggested_curriculum_gaps: Optional[List[str]] = []

class ReadinessAnalysis(BaseModel):
    score: float = Field(..., ge=0, le=100)
    tip: str = Field(..., description="A short, actionable growth tip")
    weak_areas: List[str] = []

class AssessmentExtraction(BaseModel):
    subject: str = Field(..., description="The main subject of the assessment")
    topic: str = Field(..., description="The specific topic or chapter")
    questions: List[QuestionInfo] = []

class GapsExtractor:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        # Using the exact string found in the discovery list
        self.model_id = "gemini-flash-latest"

    async def extract_tags_from_text(self, text: str) -> AssessmentExtraction:
        prompt = f"""
        Analyze this assessment text and return a structured JSON response.
        Identify the subject, questions, tags, and difficulty.
        
        DATA:
        {text}
        """
        
        try:
            print(f"CALLING AI ENGINE: {self.model_id}...")
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': AssessmentExtraction,
                }
            )
            
            raw_text = response.text
            print(f"AI RESPONSE RECEIVED: {raw_text[:100]}...")
            
            # Use safe parsing to handle any Pydantic V2/V1 differences
            data = json.loads(raw_text)
            return AssessmentExtraction.model_validate(data)
            
        except Exception as e:
            print(f"!!! AI ENGINE ERROR !!!: {e}")
            raise e

    async def analyze_readiness(self, data: dict) -> ReadinessAnalysis:
        prompt = f"""
        Analyze this engineering student's placement readiness:
        - Average Test Scores: {data.get('scores', [])}
        - Weak Areas: {data.get('weakAreas', [])}
        - CGPA: {data.get('cgpa', 0)}
        - Focus Loss (Discipline): {data.get('focusLossCount', 0)}
        - Branch: {data.get('branch', 'General')}
        
        Predict a readiness score (0-100) and provide a 1-sentence growth tip.
        """
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': ReadinessAnalysis,
                }
            )
            return ReadinessAnalysis.model_validate_json(response.text)
        except Exception as e:
            print(f"Readiness Analysis Error: {e}")
            raise e

    async def generate_next_question(self, context: dict) -> str:
        prompt = f"""
        Role: Senior Technical Interviewer
        Context: Conducting a {context.get('mode', 'Technical')} interview for {context.get('studentName', 'a student')}.
        
        Transcript so far:
        {json.dumps(context.get('transcript', []), indent=2)}
        
        Based on the transcript, ask the next relevant question. 
        If there is no transcript, ask a good starting question for a {context.get('mode')} interview.
        Be professional, brief, and probing.
        """
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            print(f"Interview Question Error: {e}")
            return "Could you elaborate on your most challenging technical project?"

    async def analyze_interview(self, transcript: str) -> dict:
        prompt = f"""
        Analyze this interview transcript and provide a structured JSON report.
        
        TRANSCRIPT:
        {transcript}
        
        Evaluate:
        1. Overall Score (0-100)
        2. Breakdown (0-100 for Technical, Communication, Confidence, Problem Solving)
        3. Detailed feedback (1-2 paragraphs)
        """
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config={
                    'response_mime_type': 'application/json'
                }
            )
            data = json.loads(response.text)
            # Ensure it matches the expected structure
            return {
                "score": data.get("score") or data.get("overall_score") or 70,
                "analysis": data.get("analysis") or data.get("breakdown") or {"technical": 70, "communication": 70},
                "feedback": data.get("feedback") or "Good performance overall."
            }
        except Exception as e:
            print(f"Interview Analysis Error: {e}")
            return {"score": 65, "analysis": {"technical": 60, "communication": 70}, "feedback": "Manual review recommended."}

extractor_service = GapsExtractor()
