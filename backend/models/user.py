"""User-related Pydantic models."""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import Field

from .base import BaseSchema, TimestampMixin, UUIDMixin


class UserProfile(BaseSchema, TimestampMixin, UUIDMixin):
    """Schema for user profile."""
    
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = 'user'
    team_id: Optional[UUID] = None
    locale: str = 'en'
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserUpdate(BaseSchema):
    """Schema for updating user profile."""
    
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    locale: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class UserStats(BaseSchema):
    """Schema for user statistics."""
    
    total_calls: int
    analyzed_calls: int
    avg_score: Optional[float]
    practice_sessions: int
    total_call_minutes: int
