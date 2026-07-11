from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/timeline", tags=["timeline"])

@router.get("/{case_id}", response_model=List[schemas.TimelineEventResponse])
def get_case_timeline(
    case_id: int,
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    db: Session = Depends(get_db)
):
    query = db.query(models.TimelineEvent).filter(models.TimelineEvent.case_id == case_id)
    if event_type:
        query = query.filter(models.TimelineEvent.event_type == event_type)
    return query.order_by(models.TimelineEvent.timestamp.asc()).all()
