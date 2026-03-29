"""
NEPON AI Engine — Hybrid Recommender

Trains a hybrid recommendation model combining collaborative filtering (SVD),
content-based TF-IDF similarity, context re-ranking, and cold-start fallbacks,
and persists the artefacts so the FastAPI process can load them without
retraining on every restart.
"""

from __future__ import annotations

import os
import pickle
import logging
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

from config import settings
from database import get_sync_db

logger = logging.getLogger("nepon.recommender")

# Paths for persisted model artefacts
MODEL_DIR = settings.model_dir
SVD_PATH = os.path.join(MODEL_DIR, "svd_model.pkl")
TFIDF_PATH = os.path.join(MODEL_DIR, "tfidf_matrix.pkl")
MAPPINGS_PATH = os.path.join(MODEL_DIR, "mappings.pkl")
META_PATH = os.path.join(MODEL_DIR, "meta.pkl")


def _ensure_model_dir() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)


# 1. Data loading

def _load_interactions(db: Any) -> pd.DataFrame:
    """
    Build the implicit-feedback interaction matrix from user activity:
    orders, reviews, wishlists, carts, and AI interaction history (views).
    Each signal contributes a weight; rows are (user_id, product_id, weight).
    """
    rows: list[dict] = []

    for order in db.orders.find({"status": {"$in": ["delivered", "completed"]}}):
        buyer = str(order["buyerId"])
        for item in order.get("items", []):
            rows.append({
                "user_id": buyer,
                "product_id": str(item["productId"]),
                "weight": settings.weight_purchase,
            })

    for review in db.reviews.find({"status": "visible"}):
        rows.append({
            "user_id": str(review["buyerId"]),
            "product_id": str(review["productId"]),
            "weight": settings.weight_review,
        })

    for wl in db.wishlists.find():
        user = str(wl.get("userId") or wl.get("buyerId"))
        for item in wl.get("items", []):
            pid = str(item.get("productId", item)) if isinstance(item, dict) else str(item)
            rows.append({
                "user_id": user,
                "product_id": pid,
                "weight": settings.weight_wishlist,
            })

    for cart in db.carts.find():
        user = str(cart.get("userId") or cart.get("buyerId"))
        for item in cart.get("items", []):
            rows.append({
                "user_id": user,
                "product_id": str(item.get("productId", "")),
                "weight": settings.weight_cart,
            })

    for event in db.ai_interaction_history.find():
        w = settings.weight_view
        rows.append({
            "user_id": str(event["userId"]),
            "product_id": str(event["productId"]),
            "weight": w,
        })

    if not rows:
        return pd.DataFrame(columns=["user_id", "product_id", "weight"])

    df = pd.DataFrame(rows)
    # Sum weights when the same (user, product) pair appears in multiple sources
    df = df.groupby(["user_id", "product_id"], as_index=False)["weight"].sum()
    return df


def _load_products(db: Any) -> pd.DataFrame:
    """Load published products with text features for content-based similarity."""
    products = list(db.products.find({"status": "published", "deletedAt": None}))
    # Batch-load categories once instead of one query per product (N+1)
    category_names = {c["_id"]: c["name"] for c in db.categories.find({})}
    rows = []
    for p in products:
        cat_name = category_names.get(p.get("category"), "")
        text = f"{p.get('title', '')} {p.get('description', '')} {cat_name}"
        rows.append({
            "product_id": str(p["_id"]),
            "text": text,
            "category": cat_name,
            "price": p.get("variants", [{}])[0].get("price", 0) if p.get("variants") else 0,
            "created_at": p.get("createdAt", datetime.now(timezone.utc)),
            "rating_avg": p.get("ratingAverage", 0),
            "rating_count": p.get("ratingCount", 0),
        })
    return pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["product_id", "text", "category", "price", "created_at", "rating_avg", "rating_count"]
    )


# 2. SVD collaborative filtering

def _train_svd(
    interactions: pd.DataFrame,
    product_ids: list[str],
) -> tuple[TruncatedSVD | None, csr_matrix | None, dict, dict]:
    """
    Train a TruncatedSVD model on the user–product interaction matrix.

    Returns (model, transformed_matrix, user_index_map, product_index_map).
    If there are too few interactions, returns Nones so the system falls back
    to content-based recommendations.
    """
    if interactions.empty or len(interactions) < 5:
        logger.warning("Too few interactions for SVD — skipping collaborative filtering.")
        return None, None, {}, {}

    user_ids = sorted(interactions["user_id"].unique())
    prod_ids = sorted(interactions["product_id"].unique())

    user_idx = {uid: i for i, uid in enumerate(user_ids)}
    prod_idx = {pid: i for i, pid in enumerate(prod_ids)}

    row_indices = interactions["user_id"].map(user_idx).values
    col_indices = interactions["product_id"].map(prod_idx).values
    weights = interactions["weight"].values

    matrix = csr_matrix(
        (weights, (row_indices, col_indices)),
        shape=(len(user_ids), len(prod_ids)),
    )

    n_components = min(settings.svd_n_components, min(matrix.shape) - 1)
    if n_components < 1:
        return None, None, {}, {}

    svd = TruncatedSVD(n_components=n_components, n_iter=settings.svd_n_iter, random_state=42)
    user_factors = svd.fit_transform(matrix)
    # Normalise for cosine-style scoring
    user_factors = normalize(user_factors)

    return svd, matrix, user_idx, prod_idx


# 3. Content-based similarity (TF-IDF)

def _train_tfidf(products_df: pd.DataFrame) -> tuple[Any, TfidfVectorizer]:
    """Build the TF-IDF matrix over product text features."""
    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words="english",
        ngram_range=(1, 2),
    )
    tfidf_matrix = vectorizer.fit_transform(products_df["text"].fillna(""))
    return tfidf_matrix, vectorizer


# 4. Popularity fallback (cold start)

def _popularity_scores(products_df: pd.DataFrame) -> pd.Series:
    """
    Compute a popularity score per product for cold-start fallback.
    Combines rating average, rating count, and recency.
    """
    if products_df.empty:
        return pd.Series(dtype=float)

    now = datetime.now(timezone.utc)
    products_df = products_df.copy()
    products_df["age_days"] = products_df["created_at"].apply(
        lambda d: max((now - d.replace(tzinfo=timezone.utc) if d.tzinfo is None else now - d).days, 1)
    )
    # Bayesian-weighted rating: (count / (count + 10)) * avg + (10 / (count + 10)) * 3.0
    products_df["bayesian"] = (
        (products_df["rating_count"] / (products_df["rating_count"] + 10)) * products_df["rating_avg"]
        + (10 / (products_df["rating_count"] + 10)) * 3.0
    )
    # Boost newer products slightly
    products_df["recency_boost"] = 1.0 / np.log1p(products_df["age_days"])
    products_df["pop_score"] = products_df["bayesian"] * 0.7 + products_df["recency_boost"] * 0.3
    return products_df.set_index("product_id")["pop_score"]


# 5. Context re-ranker

def _rerank(
    candidates: list[str],
    scores: dict[str, float],
    products_df: pd.DataFrame,
    k: int,
) -> list[str]:
    """
    Re-rank candidate product IDs for diversity and recency.

    Rules:
    - No more than 3 items from the same category in the top-K.
    - Slight boost for products created within the last 30 days.
    """
    if products_df.empty or not candidates:
        return candidates[:k]

    prod_lookup = products_df.set_index("product_id").to_dict("index")
    now = datetime.now(timezone.utc)

    scored: list[tuple[str, float]] = []
    for pid in candidates:
        base = scores.get(pid, 0.0)
        info = prod_lookup.get(pid, {})
        created = info.get("created_at", now)
        if created and hasattr(created, "days"):
            pass
        try:
            age = (now - (created.replace(tzinfo=timezone.utc) if created.tzinfo is None else created)).days
        except Exception:
            age = 999
        recency_bonus = 0.05 if age < 30 else 0.0
        scored.append((pid, base + recency_bonus))

    scored.sort(key=lambda x: x[1], reverse=True)

    # Category diversity cap
    result: list[str] = []
    cat_counts: dict[str, int] = {}
    for pid, _score in scored:
        cat = prod_lookup.get(pid, {}).get("category", "")
        if cat_counts.get(cat, 0) >= 3:
            continue
        result.append(pid)
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        if len(result) >= k:
            break

    return result


# Main training pipeline

class HybridRecommender:
    """Facade for the trained recommendation model."""

    def __init__(self) -> None:
        self.svd_model: TruncatedSVD | None = None
        self.interaction_matrix: csr_matrix | None = None
        self.user_idx: dict[str, int] = {}
        self.prod_idx: dict[str, int] = {}
        self.idx_to_prod: dict[int, str] = {}
        self.tfidf_matrix: Any = None
        self.tfidf_vectorizer: TfidfVectorizer | None = None
        self.products_df: pd.DataFrame = pd.DataFrame()
        self.popularity: pd.Series = pd.Series(dtype=float)
        self.trained_at: datetime | None = None

    def save(self) -> None:
        _ensure_model_dir()
        with open(SVD_PATH, "wb") as f:
            pickle.dump((self.svd_model, self.interaction_matrix, self.user_idx, self.prod_idx), f)
        with open(TFIDF_PATH, "wb") as f:
            pickle.dump((self.tfidf_matrix, self.tfidf_vectorizer), f)
        with open(MAPPINGS_PATH, "wb") as f:
            pickle.dump((self.products_df, self.popularity, self.idx_to_prod), f)
        with open(META_PATH, "wb") as f:
            pickle.dump({"trained_at": self.trained_at}, f)
        logger.info("Model artefacts saved to %s", MODEL_DIR)

    def load(self) -> bool:
        """Load persisted artefacts; returns True if successful."""
        try:
            with open(SVD_PATH, "rb") as f:
                self.svd_model, self.interaction_matrix, self.user_idx, self.prod_idx = pickle.load(f)
            with open(TFIDF_PATH, "rb") as f:
                self.tfidf_matrix, self.tfidf_vectorizer = pickle.load(f)
            with open(MAPPINGS_PATH, "rb") as f:
                self.products_df, self.popularity, self.idx_to_prod = pickle.load(f)
            with open(META_PATH, "rb") as f:
                meta = pickle.load(f)
                self.trained_at = meta.get("trained_at")
            logger.info("Model artefacts loaded (trained at %s)", self.trained_at)
            return True
        except FileNotFoundError:
            logger.warning("No trained model found on disk — will need retraining.")
            return False

    def train(self) -> dict:
        """Run the full training pipeline against current MongoDB data."""
        db = get_sync_db()
        interactions = _load_interactions(db)
        self.products_df = _load_products(db)

        # SVD collaborative filtering
        product_ids = self.products_df["product_id"].tolist()
        self.svd_model, self.interaction_matrix, self.user_idx, self.prod_idx = _train_svd(
            interactions, product_ids
        )
        self.idx_to_prod = {v: k for k, v in self.prod_idx.items()}

        # Content-based TF-IDF
        if not self.products_df.empty:
            self.tfidf_matrix, self.tfidf_vectorizer = _train_tfidf(self.products_df)
        else:
            self.tfidf_matrix = None
            self.tfidf_vectorizer = None

        # Popularity scores
        self.popularity = _popularity_scores(self.products_df)

        self.trained_at = datetime.now(timezone.utc)
        self.save()

        return {
            "interactions": len(interactions),
            "products": len(self.products_df),
            "svd_trained": self.svd_model is not None,
            "trained_at": self.trained_at.isoformat(),
        }

    def recommend_for_user(self, user_id: str, k: int = 10) -> list[str]:
        """
        Generate top-K recommendations for a user.

        Strategy:
        - If the user exists in the SVD model, use collaborative filtering scores.
        - If not (cold-start user), fall back to popularity within categories.
        - Re-rank for diversity.
        """
        if self.products_df.empty:
            return []

        all_products = self.products_df["product_id"].tolist()

        # SVD path
        if self.svd_model is not None and user_id in self.user_idx:
            user_i = self.user_idx[user_id]
            user_vec = normalize(
                self.svd_model.transform(self.interaction_matrix[user_i])  # type: ignore[arg-type]
            )
            # Reconstruct item scores
            item_components = normalize(self.svd_model.components_.T)
            scores_arr = (user_vec @ item_components.T).flatten()

            scored = {}
            for idx, score in enumerate(scores_arr):
                pid = self.idx_to_prod.get(idx)
                if pid:
                    scored[pid] = float(score)

            # Blend with popularity for products not in SVD space
            for pid in all_products:
                if pid not in scored:
                    scored[pid] = float(self.popularity.get(pid, 0)) * 0.5

            candidates = sorted(scored, key=scored.get, reverse=True)  # type: ignore[arg-type]
            return _rerank(candidates, scored, self.products_df, k)

        # Cold-start: popularity fallback
        if not self.popularity.empty:
            pop_sorted = self.popularity.sort_values(ascending=False).index.tolist()
            return pop_sorted[:k]

        return all_products[:k]

    def similar_products(self, product_id: str, k: int = 8) -> list[str]:
        """
        Find K products most similar to the given product using TF-IDF
        cosine similarity.
        """
        if self.tfidf_matrix is None or self.products_df.empty:
            return []

        product_ids = self.products_df["product_id"].tolist()
        if product_id not in product_ids:
            return []

        idx = product_ids.index(product_id)
        sim_scores = cosine_similarity(
            self.tfidf_matrix[idx], self.tfidf_matrix
        ).flatten()

        # Exclude the product itself
        sim_scores[idx] = -1.0
        top_indices = sim_scores.argsort()[::-1][:k]
        return [product_ids[i] for i in top_indices if sim_scores[i] > 0]


# Module-level singleton
recommender = HybridRecommender()
