from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import os
import random
from datetime import datetime

app = FastAPI(
    title="ReviewRadar API",
    description="API for Sentiment Analysis Dashboard & QC",
    version="1.0.0"
)

# --- Config Path ---
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app.mount("/static", StaticFiles(directory=os.path.join(base_dir, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(base_dir, "templates"))


# ==========================================
# 0. PYDANTIC MODELS (SCHEMAS)
# ==========================================

# --- Common Models ---
class DateRange(BaseModel):
    start: Optional[str]
    end: Optional[str]

# --- 1. Metrics Models ---
class AppliedFilters(BaseModel):
    platforms: List[str]
    date_range: DateRange

class MetricsMeta(BaseModel):
    applied_filters: AppliedFilters

class PlatformCounts(BaseModel):
    youtube: int = 0
    facebook: int = 0
    instagram: int = 0
    tiktok: int = 0
    google: int = 0
    shopee: int = 0

class SentimentCount(BaseModel):
    positive: int
    negative: int
    neutral: int

class MetricsData(BaseModel):
    platform_counts: PlatformCounts
    overall_sentiment: SentimentCount
    # Key = Aspect Name (e.g., "TASTE"), Value = Counts
    aspect_metrics: Dict[str, SentimentCount] 

class MetricsResponse(BaseModel):
    meta: MetricsMeta
    data: MetricsData

# --- 2. Reviews Models ---
class ReviewResultDetail(BaseModel):
    sentiment: str
    confidence: float

class ReviewItem(BaseModel):
    review_id: int
    source_platform: str
    review_date: str
    content: str
    # Key = Aspect (e.g. "scent", "price"), Value = Sentiment Detail
    results: Dict[str, ReviewResultDetail] 

class ReviewMeta(BaseModel):
    total_found: int
    sort: str
    batch_id: str

class ReviewsResponse(BaseModel):
    meta: ReviewMeta
    data: List[ReviewItem]

# --- 3. QC Session Models ---
class QCBreakdown(BaseModel):
    low_confidence_count: int
    random_audit_count: int

class QCData(BaseModel):
    session_id: int
    total_items: int
    breakdown: QCBreakdown
    created_at: str

class QCSessionResponse(BaseModel):
    message: str
    data: QCData

# --- 4. QC Items Models ---
class QCProgress(BaseModel):
    total: int
    reviewed: int
    remaining: int

class QCMeta(BaseModel):
    session_id: int
    batch_name: str
    progress: QCProgress

class QCItem(BaseModel):
    qc_item_id: int
    review_id: int
    review_content: str
    aspect: str
    predicted_sentiment: str
    confidence: float
    sentiment_gap: float
    status: str

class QCItemsResponse(BaseModel):
    meta: QCMeta
    items: List[QCItem]

# --- 5. QC Update Models ---
class QCItemUpdatePayload(BaseModel):
    correct_sentiment: Optional[str] = None
    confirmed: int

class QCUpdateData(BaseModel):
    qc_item_id: int
    status: str
    final_sentiment: str
    updated_at: str

class QCUpdateResponse(BaseModel):
    success: bool
    data: QCUpdateData


# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

# 1.1 GET Metrics
@app.get("/api/batches/{batch_id}/metrics", response_model=MetricsResponse)
async def get_batch_metrics(
    batch_id: str,
    platforms: Optional[str] = Query(None, description="Comma separated platforms"),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    platform_list = platforms.split(",") if platforms else []

    return {
        "meta": {
            "applied_filters": {
                "platforms": platform_list,
                "date_range": {"start": from_date, "end": to_date}
            }
        },
        "data": {
            "platform_counts": {
                "youtube": 1204, "facebook": 724, "instagram": 300,
                "tiktok": 2500, "google": 600, "shopee": 500
            },
            "overall_sentiment": {
                "positive": 1024, "negative": 290, "neutral": 105,
            },
            "aspect_metrics": {
                "TASTE": { "positive": 80, "negative": 10, "neutral": 1 },
                "PRICE": { "positive": 60, "negative": 20, "neutral": 0 },
                "SERVICE": { "positive": 90, "negative": 5, "neutral": 1 },
                "ATMOSPHERE": { "positive": 8, "negative": 0, "neutral": 2 },
                "ACCESSIBILITY": { "positive": 4, "negative": 0, "neutral": 1 }
            }
        }
    }

# 1.2 GET Reviews
@app.get("/api/batches/{batch_id}/reviews", response_model=ReviewsResponse)
async def get_batch_reviews(
    batch_id: str,
    sort: str = "random",
    limit: int = 10,
    platform: Optional[str] = None
):
    mock_reviews_pool = [
        {
            "review_id": 1054, "source_platform": "shopee", "review_date": "2024-01-15",
            "content": "ซื้อให้แม่ แม่ชอบกลิ่นมากแต่บอกว่าขวดเล็กไปหน่อย",
            "results": {
                "scent": { "sentiment": "positive", "confidence": 0.98 }, 
                "price": { "sentiment": "neutral", "confidence": 0.50 }
            }
        },
        {
            "review_id": 882, "source_platform": "facebook", "review_date": "2024-01-14",
            "content": "ส่งของแย่มาก กล่องบุบหมดเลย",
            "results": {
                "service": { "sentiment": "negative", "confidence": 0.99 },
                "packaging": { "sentiment": "negative", "confidence": 0.95 }
            }
        },
        {
            "review_id": 309, "source_platform": "google", "review_date": "2024-01-10",
            "content": "คุณภาพดีเยี่ยม! คุ้มราคา",
            "results": {
                "quality": { "sentiment": "positive", "confidence": 0.92 },
                "price": { "sentiment": "positive", "confidence": 0.90 }
            }
        },
        {
            "review_id": 401, "source_platform": "tiktok", "review_date": "2024-01-11",
            "content": "เฉยๆ นะ ไม่ได้ว้าวมาก",
            "results": {
                "taste": { "sentiment": "neutral", "confidence": 0.60 }
            }
        },
        {
            "review_id": 505, "source_platform": "youtube", "review_date": "2024-01-12",
            "content": "แพงไปหน่อยแต่อร่อยจริง",
            "results": {
                "price": { "sentiment": "negative", "confidence": 0.70 },
                "taste": { "sentiment": "positive", "confidence": 0.95 }
            }
        }
    ]

    filtered = mock_reviews_pool
    if platform and platform != 'all':
        filtered = [r for r in filtered if r['source_platform'] == platform]

    if sort == "random":
        count = min(limit, len(filtered))
        selected_reviews = random.sample(filtered, count)
    else:
        selected_reviews = filtered[:limit]

    return {
        "meta": { "total_found": len(filtered), "sort": sort, "batch_id": batch_id },
        "data": selected_reviews
    }

# 2.1 POST QC Session
@app.post("/api/batches/{batch_id}/qc-sessions", status_code=201, response_model=QCSessionResponse)
async def create_qc_session(batch_id: str):
    return {
        "message": "QC Session generated successfully",
        "data": {
            "session_id": 55,
            "total_items": 50,
            "breakdown": { "low_confidence_count": 40, "random_audit_count": 10 },
            "created_at": datetime.now().isoformat() + "Z"
        }
    }

# 2.2 GET QC Session Items
@app.get("/api/qc-sessions/{session_id}", response_model=QCItemsResponse)
async def get_qc_session_items(session_id: int):
    mock_qc_items = [
        {
            "qc_item_id": 1042, "review_id": 9981,
            "review_content": "รสชาติพอไปวัดไปวาได้ แต่ราคานี่ไม่ไหวเลย",
            "aspect": "price", "predicted_sentiment": "neutral",
            "confidence": 0.44, "sentiment_gap": 0.10, "status": "pending",
        },
        {
            "qc_item_id": 1043, "review_id": 9981,
            "review_content": "รสชาติพอไปวัดไปวาได้ แต่ราคานี่ไม่ไหวเลย",
            "aspect": "taste", "predicted_sentiment": "positive",
            "confidence": 0.95, "sentiment_gap": 0.80, "status": "pending"
        }
    ]
    return {
        "meta": {
            "session_id": session_id,
            "batch_name": "KFC_Competitor_Analysis_Q1",
            "progress": { "total": 50, "reviewed": 12, "remaining": 38 }
        },
        "items": mock_qc_items
    }

# 2.3 PATCH QC Item
@app.patch("/api/qc-items/{qc_item_id}", response_model=QCUpdateResponse)
async def update_qc_item(qc_item_id: int, payload: QCItemUpdatePayload):
    final_sentiment = payload.correct_sentiment if payload.correct_sentiment else "original_prediction"
    
    # Mock logic
    mock_original_prediction = "neutral" if qc_item_id == 1042 else "positive"
    if final_sentiment == "original_prediction":
        final_sentiment = mock_original_prediction

    return {
        "success": True,
        "data": {
            "qc_item_id": qc_item_id,
            "status": "reviewed",
            "final_sentiment": final_sentiment,
            "updated_at": datetime.now().isoformat() + "Z"
        }
    }
