from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import tasks as tasks_router, chat as chat_router, internal as internal_router
from tasks.store import init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db(settings.db_path)
    yield


app = FastAPI(title="NovAI Agent Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks_router.router, prefix="/tasks", tags=["tasks"])
app.include_router(chat_router.router, tags=["chat"])
app.include_router(internal_router.router, tags=["internal"])


@app.get("/health")
async def health():
    return {"status": "ok"}
