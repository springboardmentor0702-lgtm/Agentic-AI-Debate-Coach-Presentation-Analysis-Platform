from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from pydantic import BaseModel
from pydantic import Field

from models import User
from security import current_user

from services.presentation_analyzer import (
    analyze_presentation
)


router = APIRouter(
    prefix="/api/presentation",
    tags=["Presentation Analysis"]
)


class PresentationRequest(BaseModel):

    transcript: str = Field(
        min_length=10,
        max_length=50000
    )

    duration_seconds: float = Field(
        default=60,
        gt=0,
        le=7200
    )


@router.post("/analyze")
def analyze(
    request: PresentationRequest,

    user: User = Depends(current_user)
):

    try:

        result = analyze_presentation(
            request.transcript,
            request.duration_seconds
        )

        result["user_id"] = user.id

        return result

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )
@router.get("/history")
def presentation_history(
    user: User = Depends(current_user),

    db: Session = Depends(get_db)
):

    records = (
        db.query(
            PresentationAnalysis
        )
        .filter(
            PresentationAnalysis.user_id
            == user.id
        )
        .order_by(
            PresentationAnalysis.created_at.desc()
        )
        .all()
    )

    return {

        "count":
            len(records),

        "results": [

            {
                "id": item.id,

                "overall_score":
                    item.overall_score,

                "pace_score":
                    item.pace_score,

                "filler_score":
                    item.filler_score,

                "confidence_score":
                    item.confidence_score,

                "clarity_score":
                    item.clarity_score,

                "engagement_score":
                    item.engagement_score,

                "duration_seconds":
                    item.duration_seconds,

                "created_at":
                    item.created_at
            }
            from fastapi import UploadFile
from fastapi import File

import tempfile
import os

from services.speech_to_text import (
    transcribe_audio
)


@router.post("/analyze-audio")
async def analyze_audio(
    file: UploadFile = File(...),

    duration_seconds: float = 60,

    user: User = Depends(current_user),

    db: Session = Depends(get_db)
):

    allowed_types = {

        "audio/wav",

        "audio/mpeg",

        "audio/mp3",

        "audio/x-wav",

        "video/mp4"
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail="Unsupported audio/video format."
        )

    suffix = os.path.splitext(
        file.filename or ".wav"
    )[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix
    ) as temp:

        temp.write(
            await file.read()
        )

        temp_path = temp.name

    try:

        transcript = transcribe_audio(
            temp_path
        )

        result = analyze_presentation(
            transcript,
            duration_seconds
        )

        analysis = PresentationAnalysis(

            user_id=user.id,

            transcript=transcript,

            duration_seconds=
                duration_seconds,

            overall_score=
                result["overall_score"],

            pace_score=
                result["speech_pace"][
                    "pace_score"
                ],

            filler_score=
                result["filler_words"][
                    "filler_control_score"
                ],

            confidence_score=
                result["confidence"][
                    "confidence_score"
                ],

            clarity_score=
                result["clarity"][
                    "clarity_score"
                ],

            engagement_score=
                result["engagement"][
                    "engagement_score"
                ],

            feedback=
                "\n".join(
                    result["feedback"]
                )
        )

        db.add(
            analysis
        )

        db.commit()

        db.refresh(
            analysis
        )

        result["id"] = analysis.id

        return result

    finally:

        if os.path.exists(
            temp_path
        ):

            os.remove(
                temp_path
            )

            for item in records
        ]
    }
