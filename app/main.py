from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles  # เพิ่มตัวนี้
import os

app = FastAPI()

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app.mount("/static", StaticFiles(directory=os.path.join(base_dir, "static")), name="static")

templates = Jinja2Templates(directory=os.path.join(base_dir, "templates"))

@app.get("/", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})
