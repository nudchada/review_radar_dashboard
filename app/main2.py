from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException
from pydantic import BaseModel
import os
from typing import Optional
import random
from datetime import datetime

app = FastAPI()

# --- Config Path ---
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app.mount("/static", StaticFiles(directory=os.path.join(base_dir, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(base_dir, "templates"))

class QCItemUpdate(BaseModel):
    correct_sentiment: Optional[str] = None
    confirmed: int


# --- 1. Endpoint: Render Dashboard HTML ---
@app.get("/", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})


# --- 2. API Endpoints (MOCKUP) ---

# 2.1 GET /api/batches/{BATCH_ID}/metrics
@app.get("/api/batches/{batch_id}/metrics")
async def get_batch_metrics(
    batch_id: str,
    platforms: Optional[str] = Query(None, description="Comma separated platforms e.g. shopee,google"),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    # แปลง string "shopee,google" เป็น list ["shopee", "google"]
    platform_list = platforms.split(",") if platforms else []

    # Mock Response ตามโครงสร้างที่คุณต้องการ
    return {
        "meta": {
            "applied_filters": {
                "platforms": platform_list,
                "date_range": {
                    "start": from_date,
                    "end": to_date
                }
            }
        },
        "data": {
            # 1. Top Header Icons
            "platform_counts": {
                "youtube": 1204,
                "facebook": 724,
                "instagram": 300,
                "shopee": 500,
                "google": 150
            },
            # 2. The Pie Chart (Overall)
            "overall_sentiment": {
                "positive": 1024,
                "negative": 29,
                "neutral": 10,
            },
            # 3. The Bar Charts (Aspects)
            "aspect_metrics": {
                "TASTE": { "positive": 80, "negative": 10, "neutral": 1 },
                "PRICE": { "positive": 60, "negative": 20, "neutral": 0 },
                "SERVICE": { "positive": 90, "negative": 5, "neutral": 1 },
                "ATMOSPHERE": { "positive": 8, "negative": 0, "neutral": 2 },
                "ACCESSIBILITY": { "positive": 4, "negative": 0, "neutral": 1 }
            }
        }
    }


# 2.2 GET /api/batches/{batch_id}/reviews/
@app.get("/api/batches/{batch_id}/reviews")
async def get_batch_reviews(
    batch_id: str,
    sort: str = "random",
    limit: int = 3
):
    # Mock Data Pool (จำลองฐานข้อมูลรีวิว)
    mock_reviews_pool = [
        {
            "review_id": 1054,
            "source_platform": "shopee",
            "review_date": "2024-01-15T09:30:00Z",
            "content": "Bought this for my mom. She loves the smell but said the bottle is too small.",
            "results": {
                "scent": { "sentiment": "positive", "confidence": 0.98 },
                "size": { "sentiment": "negative", "confidence": 0.85 },
                "price": { "sentiment": "neutral", "confidence": 0.50 }
            }
        },
        {
            "review_id": 882,
            "source_platform": "facebook",
            "review_date": "2024-01-14T14:20:00Z",
            "content": "Delivery was terrible. Box was crushed.",
            "results": {
                "service": { "sentiment": "negative", "confidence": 0.99 },
                "packaging": { "sentiment": "negative", "confidence": 0.95 }
            }
        },
        {
            "review_id": 309,
            "source_platform": "google",
            "review_date": "2024-01-10T11:00:00Z",
            "content": "Excellent quality!",
            "results": {
                "quality": { "sentiment": "positive", "confidence": 0.92 }
            }
        },
        {
            "review_id": 401,
            "source_platform": "tiktok",
            "review_date": "2024-01-11T12:00:00Z",
            "content": "เฉยๆ นะ ไม่ได้ว้าวมาก",
            "results": {
                "taste": { "sentiment": "neutral", "confidence": 0.60 }
            }
        },
        {
            "review_id": 505,
            "source_platform": "youtube",
            "review_date": "2024-01-12T10:00:00Z",
            "content": "แพงไปหน่อยแต่อร่อยจริง",
            "results": {
                "price": { "sentiment": "negative", "confidence": 0.70 },
                "taste": { "sentiment": "positive", "confidence": 0.95 }
            }
        }
    ]

    # Logic จำลองการดึงข้อมูล
    # ถ้า sort=random ให้สุ่ม, ถ้าไม่ ก็เอาตามลำดับ
    selected_reviews = mock_reviews_pool
    if sort == "random":
        selected_reviews = random.sample(mock_reviews_pool, min(limit, len(mock_reviews_pool)))
    else:
        selected_reviews = mock_reviews_pool[:limit]

    return {
        "meta": {
            "total_found": len(selected_reviews),
            "sort": sort,
            "batch_id": batch_id
        },
        "data": selected_reviews
    }

# --- 2.3 QC Endpoints (MOCKUP) ---

# 2.1 POST /api/batches/{batch_id}/qc-sessions
@app.post("/api/batches/{batch_id}/qc-sessions", status_code=201)
async def create_qc_session(batch_id: str):
    # Simulate DB Action: 
    # INSERT INTO qc_sessions (batch_id, active_learning_strategy) VALUES (batch_id, 'bucket A');
    print(f"Mock DB: Created QC Session for batch {batch_id} with Active Learning = 'Bucket A'")

    # Return Mock Data
    return {
        "message": "QC Session generated successfully",
        "data": {
            "session_id": 55,
            "total_items": 50,
            "breakdown": {
                "low_confidence_count": 40, # Bucket A
                "random_audit_count": 10    # Bucket B
            },
            "created_at": datetime.now().isoformat() + "Z"
        }
    }


# 2.2 GET /api/qc-sessions/{session_id}
@app.get("/api/qc-sessions/{session_id}")
async def get_qc_session_items(session_id: int):
    # Mock Data: จำลองเคสรีวิวเดียวกัน (9981) แต่คนละ Aspect ตามที่คุณระบุ
    mock_qc_items = [
        {
            "qc_item_id": 1042,
            "review_id": 9981,
            "review_content": "รสชาติพอไปวัดไปวาได้ แต่ราคานี่ไม่ไหวเลย",
            "aspect": "price",
            "predicted_sentiment": "neutral",
            "confidence": 0.44,          # Low confidence -> Bucket A
            "sentiment_gap": 0.10,
            "status": "pending",
        },
        {
            "qc_item_id": 1043,
            "review_id": 9981,           # รีวิวเดียวกัน
            "review_content": "รสชาติพอไปวัดไปวาได้ แต่ราคานี่ไม่ไหวเลย",
            "aspect": "taste",
            "predicted_sentiment": "positive",
            "confidence": 0.95,          # High confidence -> Bucket B (Audit)
            "sentiment_gap": 0.80,
            "status": "pending"
        }
    ]

    return {
        "meta": {
            "session_id": session_id,
            "batch_name": "KFC_Competitor_Analysis_Q1",
            "progress": {
                "total": 50,
                "reviewed": 12,
                "remaining": 38
            }
        },
        "items": mock_qc_items
    }


# 2.3 PATCH /api/qc-items/{qc_item_id}
@app.patch("/api/qc-items/{qc_item_id}")
async def update_qc_item(qc_item_id: int, payload: QCItemUpdate):
    # Simulate DB Update logic
    
    # 1. Determine final sentiment
    # ถ้า user ส่ง correct_sentiment มา ให้ใช้ค่าใหม่
    # ถ้าไม่ส่ง (เป็น None) ให้ใช้ค่าเดิม (สมมติว่าค่าเดิมคือ neutral/positive จาก mock ข้างบน)
    final_sentiment = payload.correct_sentiment if payload.correct_sentiment else "original_prediction" 
    
    # Mock logic: เพื่อให้ Response ดูสมจริง เราจะ hardcode ให้ตรงกับ ID ที่ยิงมา
    mock_original_prediction = "neutral" if qc_item_id == 1042 else "positive"
    
    if final_sentiment == "original_prediction":
        final_sentiment = mock_original_prediction

    print(f"Mock DB: Update item {qc_item_id} -> Confirmed: {payload.confirmed}, Sentiment: {final_sentiment}")

    return {
        "success": True,
        "data": {
            "qc_item_id": qc_item_id,
            "status": "reviewed",
            "final_sentiment": final_sentiment,
            "updated_at": datetime.now().isoformat() + "Z"
        }
    }
