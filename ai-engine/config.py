"""
NEPON AI Engine — Configuration

Loads environment variables and provides typed settings for the AI service.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    mongodb_uri: str = Field(
        default="mongodb://localhost:27017/nepon",
        alias="MONGODB_URI",
    )
    ai_engine_port: int = Field(default=8000, alias="AI_ENGINE_PORT")
    model_dir: str = Field(default="./model_store", alias="MODEL_DIR")

    # Weights for implicit feedback signals when building the interaction matrix
    weight_view: float = 1.0
    weight_wishlist: float = 2.0
    weight_cart: float = 3.0
    weight_purchase: float = 5.0
    weight_review: float = 4.0

    svd_n_components: int = 50
    svd_n_iter: int = 20

    default_k: int = 10
    cache_ttl_seconds: int = 3600  # 1 hour

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
