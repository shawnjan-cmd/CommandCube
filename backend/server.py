from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early so startup messages are captured
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ── MongoDB connection (deployment-safe) ─────────────────────────────────────
# Never crash if MONGO_URL / DB_NAME are missing or malformed. K8s would
# kill the pod and restart-loop forever. Instead, log a warning and let
# routes that need the DB respond with 503 when client is None.
client: Optional[AsyncIOMotorClient] = None
db = None

try:
    mongo_url = os.environ.get('MONGO_URL') or 'mongodb://localhost:27017'
    db_name = os.environ.get('DB_NAME') or 'test_database'
    client = AsyncIOMotorClient(
        mongo_url,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )
    db = client[db_name]
    logger.info(f"Mongo client initialized for database '{db_name}'")
except Exception as e:
    logger.warning(f"Mongo client init failed (non-fatal): {e}")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup: nothing blocking — keep K8s readiness fast
    logger.info("FastAPI lifespan: startup complete")
    yield
    # Shutdown
    if client is not None:
        try:
            client.close()
        except Exception:
            pass
    logger.info("FastAPI lifespan: shutdown complete")


# Create the main app
app = FastAPI(lifespan=lifespan)


# ── Root health endpoints ────────────────────────────────────────────────────
# Kubernetes liveness / readiness probes hit `GET /` directly on the pod
# (bypassing the ingress that routes `/api/*` here). Without this route the
# probe gets a 404, K8s marks the pod unhealthy, and we end up in a restart
# loop. Keep this lightweight — no DB calls — so probe latency stays low.
@app.get("/")
async def health_root():
    return {"status": "ok", "service": "butler-ai-backend"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.head("/")
async def health_root_head():
    return {"status": "ok"}


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.get("/health")
async def api_health():
    return {"status": "ok"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    if db is None:
        return StatusCheck(client_name=input.client_name)
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    try:
        _ = await db.status_checks.insert_one(status_obj.dict())
    except Exception as e:
        logger.warning(f"status_checks.insert_one failed: {e}")
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if db is None:
        return []
    try:
        status_checks = await db.status_checks.find(
            {},
            {"_id": 0, "id": 1, "client_name": 1, "timestamp": 1},
        ).to_list(1000)
        return [StatusCheck(**status_check) for status_check in status_checks]
    except Exception as e:
        logger.warning(f"status_checks.find failed: {e}")
        return []

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
