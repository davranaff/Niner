from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.profile import services
from app.modules.profile.schemas import ProfileOut, ProfilePatchIn

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=ProfileOut)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileOut:
    profile = await services.get_or_create_profile(db, current_user)
    return ProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        date_of_birth=profile.date_of_birth,
        country=profile.country,
        native_language=profile.native_language,
        target_band_score=profile.target_band_score,
    )


@router.patch("/profile", response_model=ProfileOut)
async def patch_profile(
    payload: ProfilePatchIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileOut:
    clean_payload = payload.model_dump(exclude_none=True)
    return await services.patch_profile(db, current_user, clean_payload)
