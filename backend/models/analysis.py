"""Analysis-related Pydantic models."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import Field

from .base import BaseSchema, TimestampMixin, UUIDMixin


class ScoreBreakdown(BaseSchema):
    """Schema for score breakdown."""
    
    overall_score: Optional[int] = Field(None, ge=0, le=100)
    discovery_score: Optional[int] = Field(None, ge=0, le=100)
    rapport_score: Optional[int] = Field(None, ge=0, le=100)
    objection_score: Optional[int] = Field(None, ge=0, le=100)
    closing_score: Optional[int] = Field(None, ge=0, le=100)
    storytelling_score: Optional[int] = Field(None, ge=0, le=100)
    persuasion_score: Optional[int] = Field(None, ge=0, le=100)


class StrengthItem(BaseSchema):
    """Schema for strength item."""
    
    title: str
    detail: str
    timestamp_ms: Optional[int] = None


class ImprovementItem(BaseSchema):
    """Schema for improvement item."""
    
    title: str
    detail: str
    suggestion: str
    timestamp_ms: Optional[int] = None


class ObjectionDetected(BaseSchema):
    """Schema for detected objection."""
    
    text: str
    timestamp_ms: int
    handling: str
    better_response: str


class DiscoveryQuestion(BaseSchema):
    """Schema for discovery question."""
    
    question: str
    timestamp_ms: int
    effectiveness: str


class PersuasionTechnique(BaseSchema):
    """Schema for persuasion technique."""
    
    technique: str
    example: str
    timestamp_ms: int


class StoryUsed(BaseSchema):
    """Schema for story used."""
    
    summary: str
    timestamp_ms: int
    effectiveness: str


class SubconsciousCue(BaseSchema):
    """Schema for subconscious cue."""
    
    cue: str
    context: str
    timestamp_ms: int


class PainPoint(BaseSchema):
    """Schema for pain point."""
    
    pain: str
    timestamp_ms: int
    leveraged: bool


class TalkRatio(BaseSchema):
    """Schema for talk ratio."""
    
    seller_pct: float
    buyer_pct: float


class AnalysisResponse(BaseSchema, TimestampMixin, UUIDMixin):
    """Schema for analysis response."""
    
    call_id: UUID
    user_id: UUID
    
    # Scores
    overall_score: Optional[int] = Field(None, ge=0, le=100)
    discovery_score: Optional[int] = Field(None, ge=0, le=100)
    rapport_score: Optional[int] = Field(None, ge=0, le=100)
    objection_score: Optional[int] = Field(None, ge=0, le=100)
    closing_score: Optional[int] = Field(None, ge=0, le=100)
    storytelling_score: Optional[int] = Field(None, ge=0, le=100)
    persuasion_score: Optional[int] = Field(None, ge=0, le=100)
    
    # Structured findings
    summary: Optional[str] = None
    strengths: List[StrengthItem] = Field(default_factory=list)
    improvements: List[ImprovementItem] = Field(default_factory=list)
    objections_detected: List[ObjectionDetected] = Field(default_factory=list)
    discovery_questions: List[DiscoveryQuestion] = Field(default_factory=list)
    persuasion_techniques: List[PersuasionTechnique] = Field(default_factory=list)
    stories_used: List[StoryUsed] = Field(default_factory=list)
    subconscious_cues: List[SubconsciousCue] = Field(default_factory=list)
    pain_points: List[PainPoint] = Field(default_factory=list)
    talk_ratio: Optional[TalkRatio] = None
    
    # AI metadata
    model_used: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None


class AnalysisCreateRequest(BaseSchema):
    """Schema for requesting analysis creation."""
    
    force_reanalyze: bool = False
