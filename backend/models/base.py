"""Base Pydantic models and common schemas."""
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }
    )


class PaginatedResponse(BaseSchema):
    """Paginated response wrapper."""
    
    data: List[Any]
    meta: dict = Field(default_factory=dict)


class ErrorResponse(BaseSchema):
    """Error response schema."""
    
    error: dict = Field(default_factory=dict)


class TimestampMixin(BaseSchema):
    """Mixin for timestamp fields."""
    
    created_at: datetime
    updated_at: datetime


class UUIDMixin(BaseSchema):
    """Mixin for UUID primary key."""
    
    id: UUID
