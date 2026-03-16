"""Call-related Pydantic models."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import Field, field_validator

from .base import BaseSchema, TimestampMixin, UUIDMixin


class CallCreate(BaseSchema):
    """Schema for creating a new call."""
    
    name: Optional[str] = None
    language: str = 'en'
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CallResponse(BaseSchema, TimestampMixin, UUIDMixin):
    """Schema for call response."""
    
    user_id: UUID
    name: Optional[str] = None
    status: str
    duration_secs: Optional[int] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    file_mime_type: Optional[str] = None
    transcription_provider: Optional[str] = None
    language: str
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CallListItem(BaseSchema, TimestampMixin, UUIDMixin):
    """Schema for call list item (lightweight)."""
    
    name: Optional[str] = None
    status: str
    duration_secs: Optional[int] = None
    file_size_bytes: Optional[int] = None
    language: str


class CallListResponse(BaseSchema):
    """Schema for paginated call list."""
    
    data: List[CallListItem]
    meta: Dict[str, Any] = Field(default_factory=dict)


class CallStatusUpdate(BaseSchema):
    """Schema for updating call status."""
    
    name: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TranscriptSegment(BaseSchema, UUIDMixin):
    """Schema for transcript segment."""
    
    call_id: UUID
    speaker_label: str
    speaker_role: str = 'unknown'
    text: str
    start_ms: int
    end_ms: int
    confidence: Optional[float] = None
    word_count: int
    seq: int
    created_at: datetime


class SpeakerAssignment(BaseSchema):
    """Schema for speaker role assignment."""
    
    speaker_label: str
    speaker_role: str


class CallWithTranscript(CallResponse):
    """Schema for call with transcript segments."""
    
    transcript_segments: List[TranscriptSegment] = Field(default_factory=list)


class UploadResponse(BaseSchema):
    """Schema for upload response."""
    
    call_id: UUID
    status: str
    message: str
