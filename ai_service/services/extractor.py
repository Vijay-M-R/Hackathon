import os
from google import genai
from groq import Groq
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
        self.gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key and groq_key != "your_groq_api_key_here":
            self.groq_client = Groq(api_key=groq_key)
        else:
            self.groq_client = None
            print("WARNING: GROQ_API_KEY is missing or placeholder. AI Interviews will not work.")
            
        self.gemini_model = "gemini-flash-latest"
        self.groq_model = "llama-3.3-70b-versatile"

    async def extract_tags_from_text(self, text: str) -> AssessmentExtraction:
        prompt = f"""
        Analyze this assessment text and return a structured JSON response.
        Identify the subject, questions, tags, and difficulty.
        
        DATA:
        {text}
        """
        
        try:
            print(f"CALLING GEMINI: {self.gemini_model}...")
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
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
            if "RESOURCE_EXHAUSTED" in str(e) or "QUOTA" in str(e):
                print("GEMINI QUOTA HIT: Falling back to Groq for Tag Extraction...")
                return await self._extract_tags_with_groq(prompt)
            print(f"!!! AI ENGINE ERROR !!!: {e}")
            raise e

    async def _extract_tags_with_groq(self, prompt: str) -> AssessmentExtraction:
        if not self.groq_client:
            raise Exception("Gemini failed and Groq is not configured.")
            
        try:
            completion = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": "You are a curriculum expert. Extract subject, topic, and questions into JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            data = json.loads(completion.choices[0].message.content)
            return AssessmentExtraction.model_validate(data)
        except Exception as e:
            print(f"Groq Extraction Fallback Error: {e}")
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
            import asyncio
            await asyncio.sleep(1) # Rate limit protection for Free Tier
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': ReadinessAnalysis,
                }
            )
            return ReadinessAnalysis.model_validate_json(response.text)
        except Exception as e:
            if "RESOURCE_EXHAUSTED" in str(e) or "QUOTA" in str(e):
                print("GEMINI QUOTA HIT: Falling back to Groq for Readiness Analysis...")
                return await self._analyze_readiness_with_groq(prompt)
            print(f"Readiness Analysis Error: {e}")
            raise e

    async def _analyze_readiness_with_groq(self, prompt: str) -> ReadinessAnalysis:
        if not self.groq_client:
            raise Exception("Gemini failed and Groq is not configured.")
            
        try:
            completion = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": "You are a placement readiness analyst. Return JSON with 'score' (number) and 'tip' (string)."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            data = json.loads(completion.choices[0].message.content)
            return ReadinessAnalysis(
                score=data.get("score", 70),
                tip=data.get("tip", "Focus on technical fundamentals.")
            )
        except Exception as e:
            print(f"Groq Fallback Error: {e}")
            raise e

    async def generate_next_question(self, context: dict) -> str:
        if not self.groq_client:
            raise Exception("GROQ_API_KEY is not configured. Please add it to your .env file.")
            
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
            completion = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": "You are a professional technical interviewer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq Interview Question Error: {e}")
            raise e

    async def analyze_interview(self, transcript: str) -> dict:
        if not self.groq_client:
            raise Exception("GROQ_API_KEY is not configured. Please add it to your .env file.")

        # Check if transcript is essentially empty
        if len(transcript.strip()) < 50:
             return {
                "score": 0,
                "analysis": {"technical": 0, "communication": 0, "confidence": 0, "problem_solving": 0},
                "feedback": "Interview terminated early or no responses provided. Scoring 0 due to lack of participation."
            }

        prompt = f"""
        CRITICAL EVALUATION REQUIRED: Analyze this interview transcript and provide a HIGHLY CRITICAL structured JSON report.
        
        RULES:
        - If the student provides one-word answers or avoids technical questions, score them BELOW 30.
        - If the student gives no answer or says 'I don't know' repeatedly, score them 0 for that section.
        - Be honest and harsh if necessary. Do NOT give 'participation points'.
        
        TRANSCRIPT:
        {transcript}
        
        Return JSON with:
        {{
            "score": number (0-100),
            "breakdown": {{ "technical": 0-100, "communication": 0-100, "confidence": 0-100, "problemSolving": 0-100 }},
            "feedback": "string (brutally honest)"
        }}
        """
        try:
            completion = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": "You are a brutal, high-standard Interview Evaluator. You prioritize technical accuracy over politeness."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            data = json.loads(completion.choices[0].message.content)
            
            score = data.get("score")
            if score is None: score = 0
            
            breakdown = data.get("breakdown") or data.get("analysis") or {
                "technical": 0, 
                "communication": 0,
                "confidence": 0,
                "problemSolving": 0
            }
            
            return {
                "score": score,
                "analysis": breakdown,
                "feedback": data.get("feedback") or "Brutal analysis complete."
            }
        except Exception as e:
            print(f"Groq Interview Analysis Error: {e}")
            raise e

extractor_service = GapsExtractor()
