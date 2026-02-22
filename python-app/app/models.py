from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum

class Response(BaseModel):
    phrase: str

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UpdateProfileData(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None

class ChangePasswordData(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    BANNED = "banned"

class UpdateUserRole(BaseModel):
    user_id: int
    new_role: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse

class MedicalData(BaseModel):
    contraindications: Optional[str] = None
    allergens: Optional[str] = None

class MedicalDataResponse(BaseModel):
    user_id: int
    contraindications: Optional[str] = None
    allergens: Optional[str] = None
    updated_at: str

class SaveAnalysisRequest(BaseModel):
    analysis_result: Dict[str, Any]
    ingredients_count: int
    warnings_count: int

class SavedAnalysis(BaseModel):
    id: int
    user_id: int
    image_path: str
    analysis_result: Dict[str, Any]
    created_at: str
    ingredients_count: int
    warnings_count: int
    ref_count: int = 1
    original_analysis_id: Optional[int] = None
    is_reanalysis: Optional[bool] = False