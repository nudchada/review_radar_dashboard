from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import json
import random
from datetime import datetime
from collections import defaultdict

app = FastAPI(
    title="ReviewRadar API",
    description="API for Sentiment Analysis Dashboard & QC System",
    version="1.0.0"
)

# --- Config Path ---
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app.mount("/static", StaticFiles(directory=os.path.join(base_dir, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(base_dir, "templates"))


# --- Helper Function: Load Mock Data ---
def load_mock_json(filename: str):
    """โหลดไฟล์ JSON จากโฟลเดอร์ mock_data"""
    file_path = os.path.join(base_dir, "mock_data", filename)
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


# ==========================================
# 0. PYDANTIC MODELS (Schemas)
# ==========================================
# ... (ส่วน Models เหมือนเดิม ไม่ต้องแก้) ...

# --- Common Models ---
class DateRange(BaseModel):
    start: Optional[str]
    end: Optional[str]

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
    aspect_metrics: Dict[str, SentimentCount] 

class MetricsResponse(BaseModel):
    meta: MetricsMeta
    data: MetricsData

class ReviewResultDetail(BaseModel):
    sentiment: str
    confidence: float

class ReviewItem(BaseModel):
    review_id: int
    source_platform: str
    review_date: str
    content: str
    results: Dict[str, ReviewResultDetail] 

class ReviewMeta(BaseModel):
    total_found: int
    sort: str
    batch_id: str

class ReviewsResponse(BaseModel):
    meta: ReviewMeta
    data: List[ReviewItem]

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

# --- 1.1 GET Metrics ---
@app.get("/api/batches/{batch_id}/metrics", response_model=MetricsResponse)
async def get_batch_metrics(
    batch_id: str,
    platforms: Optional[str] = Query(None),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    platform_list = platforms.split(",") if platforms else []
    
    # 1. โหลด Raw Data จาก reviews.json (แทน metrics.json)
    all_reviews = load_mock_json("reviews.json")
    if not all_reviews:
        all_reviews = []

    # 2. คำนวณ Platform Counts (Global Stats)
    # นับรีวิวทั้งหมดที่มีอยู่จริง เพื่อโชว์ตัวเลขบนปุ่มกด (เช่น YouTube 10, TikTok 50)
    p_counts = defaultdict(int)
    for r in all_reviews:
        p_name = r.get("source_platform", "unknown").lower()
        p_counts[p_name] += 1

    # 3. Filter Data (กรองข้อมูลตามปุ่มที่กด)
    filtered_reviews = all_reviews
    
    # ถ้ามีการส่ง platforms มา (เช่น ?platforms=youtube) ให้คัดเฉพาะอันนั้น
    if platform_list and 'all' not in [p.lower() for p in platform_list]:
        target_platform = platform_list[0].lower()
        filtered_reviews = [r for r in filtered_reviews if r.get("source_platform", "").lower() == target_platform]

    # 4. Aggregation (คำนวณกราฟจากข้อมูลที่กรองแล้ว)
    overall_sent = {"positive": 0, "negative": 0, "neutral": 0}
    # ใช้ defaultdict เพื่อให้ไม่ต้องเช็ค key ก่อนบวก
    aspect_mets = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0})

    for r in filtered_reviews:
        results = r.get("results", {})
        for aspect, detail in results.items():
            # ดึง sentiment จาก JSON (positive, negative, neutral)
            sentiment = detail.get("sentiment", "neutral")
            
            # นับเข้า Overall Chart
            if sentiment in overall_sent:
                overall_sent[sentiment] += 1
            
            # นับเข้า Aspect Chart (แปลงชื่อเป็นตัวใหญ่ เช่น taste -> TASTE)
            aspect_key = aspect.upper()
            if sentiment in ["positive", "negative", "neutral"]:
                aspect_mets[aspect_key][sentiment] += 1

    return {
        "meta": {
            "applied_filters": {
                "platforms": platform_list,
                "date_range": {"start": from_date, "end": to_date}
            }
        },
        "data": {
            "platform_counts": dict(p_counts),     # ส่งค่าที่นับจริง
            "overall_sentiment": overall_sent,     # ส่งค่าที่นับจริง
            "aspect_metrics": dict(aspect_mets)    # ส่งค่าที่นับจริง
        }
    }

# --- 1.2 GET Reviews ---
@app.get("/api/batches/{batch_id}/reviews", response_model=ReviewsResponse)
async def get_batch_reviews(
    batch_id: str,
    sort: str = "random",
    limit: int = 10,
    platform: Optional[str] = None
):
    all_reviews = load_mock_json("reviews.json")
    if not all_reviews:
        all_reviews = []

    filtered = all_reviews
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

# --- 2.1 POST QC Session ---
@app.post("/api/batches/{batch_id}/qc-sessions", status_code=201, response_model=QCSessionResponse)
async def create_qc_session(batch_id: str):
    # ในความเป็นจริง ต้องไป Query DB มาคำนวณ
    # แต่นี้ Mock เราเลย hardcode ตัวเลข breakdown ไว้ก่อน
    return {
        "message": "QC Session generated successfully",
        "data": {
            "session_id": 55,
            "total_items": 54, # แก้ให้ตรงกับจำนวน Mock data ที่เรามี
            "breakdown": { "low_confidence_count": 44, "random_audit_count": 10 },
            "created_at": datetime.now().isoformat() + "Z"
        }
    }


# --- 2.2 GET QC Session Items (UPDATED) ---
@app.get("/api/qc-sessions/{session_id}", response_model=QCItemsResponse)
async def get_qc_session_items(session_id: int):
    # 1. โหลดข้อมูลจากไฟล์ JSON จริง
    qc_items = load_mock_json("qc_items.json")
    if not qc_items:
        qc_items = []
        
    # 2. คำนวณ Progress แบบ Dynamic
    total = len(qc_items)
    reviewed_count = len([i for i in qc_items if i.get('status') == 'reviewed'])
    remaining = total - reviewed_count

    return {
        "meta": {
            "session_id": session_id,
            "batch_name": "KFC_Competitor_Analysis_Q1",
            "progress": { 
                "total": total, 
                "reviewed": reviewed_count, 
                "remaining": remaining 
            }
        },
        "items": qc_items
    }


# --- 2.3 PATCH QC Item (UPDATED LOGIC) ---
@app.patch("/api/qc-items/{qc_item_id}", response_model=QCUpdateResponse)
async def update_qc_item(qc_item_id: int, payload: QCItemUpdatePayload):
    # 1. โหลดข้อมูลเพื่อหาตัวเดิม (Optional: ใน Mockup อาจจะไม่โหลดก็ได้)
    qc_items = load_mock_json("qc_items.json")
    
    # 2. หา Item (Mock Logic)
    target_item = next((item for item in qc_items if item["qc_item_id"] == qc_item_id), None)
    
    # 3. Determine final sentiment
    final_sentiment = payload.correct_sentiment
    if not final_sentiment:
         # ถ้าไม่ส่งค่าแก้มา ให้ใช้ค่าเดิมจาก Prediction (ถ้าหาเจอ)
         if target_item:
             final_sentiment = target_item["predicted_sentiment"]
         else:
             final_sentiment = "neutral" # Fallback

    # Note: ใน Mockup นี้เราจะไม่ save ทับไฟล์ JSON จริงๆ เพราะอาจจะทำให้ไฟล์พังได้ง่าย
    # เราจะแค่ Return Success กลับไปให้ Frontend อัปเดต UI

    print(f"Mock DB: QC Item {qc_item_id} updated -> Status: Reviewed, Sentiment: {final_sentiment}")

    return {
        "success": True,
        "data": {
            "qc_item_id": qc_item_id,
            "status": "reviewed",
            "final_sentiment": final_sentiment,
            "updated_at": datetime.now().isoformat() + "Z"
        }
    }
