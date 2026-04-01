"""
NEPON AI Engine — FastAPI Application

Exposes the recommendation API endpoints consumed by the Node.js backend.
Endpoints:
  GET  /ml/recommend/{user_id}  — personalised product recommendations
  GET  /ml/similar/{product_id} — content-based similar products
  POST /ml/retrain              — trigger offline model retraining
  GET  /ml/health               — health check
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from database import get_async_db, close_async_db
from recommender import recommender

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
logger = logging.getLogger("nepon.ai-engine")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("AI Engine starting — loading model artefacts …")
    loaded = recommender.load()
    if not loaded:
        logger.info("No pre-trained model found. Trigger /ml/retrain to train.")
    yield
    await close_async_db()
    logger.info("AI Engine shut down.")


app = FastAPI(
    title="NEPON AI Recommendation Engine",
    version="1.0.0",
    docs_url="/ml/docs",
    openapi_url="/ml/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restricted in production by Nginx
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendResponse(BaseModel):
    user_id: str
    recommendations: list[str]
    source: str  # "collaborative" | "popularity" | "empty"
    count: int


class SimilarResponse(BaseModel):
    product_id: str
    similar: list[str]
    count: int


class RetrainResponse(BaseModel):
    status: str
    interactions: int
    products: int
    svd_trained: bool
    trained_at: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    trained_at: str | None


@app.get("/ml/health", response_model=HealthResponse)
async def health():
    """Health check — reports model status."""
    return HealthResponse(
        status="ok",
        model_loaded=recommender.trained_at is not None,
        trained_at=recommender.trained_at.isoformat() if recommender.trained_at else None,
    )


@app.get("/ml/recommend/{user_id}", response_model=RecommendResponse)
async def recommend(user_id: str, k: int = Query(default=10, ge=1, le=50)):
    """
    Get personalised product recommendations for a user.

    Falls back to popularity-based recommendations if the user has no
    interaction history or the model hasn't been trained yet.
    """
    if recommender.products_df.empty:
        return RecommendResponse(
            user_id=user_id,
            recommendations=[],
            source="empty",
            count=0,
        )

    recs = recommender.recommend_for_user(user_id, k=k)

    if recommender.svd_model is not None and user_id in recommender.user_idx:
        source = "collaborative"
    else:
        source = "popularity"

    return RecommendResponse(
        user_id=user_id,
        recommendations=recs,
        source=source,
        count=len(recs),
    )


@app.get("/ml/similar/{product_id}", response_model=SimilarResponse)
async def similar(product_id: str, k: int = Query(default=8, ge=1, le=30)):
    """
    Get products similar to the given product based on content (TF-IDF)
    similarity over title, description, and category text.
    """
    results = recommender.similar_products(product_id, k=k)
    return SimilarResponse(
        product_id=product_id,
        similar=results,
        count=len(results),
    )


@app.post("/ml/retrain", response_model=RetrainResponse)
def retrain():
    """
    Trigger an offline model retraining job.

    This re-reads all interaction data from MongoDB, rebuilds the SVD model
    and TF-IDF matrix, and persists the artefacts to disk.

    In production this would be an admin-only, rate-limited endpoint.
    """
    logger.info("Retraining triggered …")
    try:
        result = recommender.train()
    except Exception as exc:
        logger.exception("Retraining failed")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {exc}")

    return RetrainResponse(
        status="success",
        interactions=result["interactions"],
        products=result["products"],
        svd_trained=result["svd_trained"],
        trained_at=result["trained_at"],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.ai_engine_port, reload=True)
