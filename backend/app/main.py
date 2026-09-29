from contextlib import asynccontextmanager

from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware


from app import models


from app.routers import auth
from app.routers import patients
from app.routers import sensors
from app.routers import alerts
from app.routers import events
from app.routers import hardware_bridge


# =========================================================
# APPLICATION LIFESPAN
# =========================================================

@asynccontextmanager
async def lifespan(
    app: FastAPI
):

    print()
    print(
        "=============================================="
    )

    print(
        "ArogyaConnect Backend Starting"
    )

    print(
        "Predefined database data mode: ENABLED"
    )

    print(
        "Automatic sensor simulator: DISABLED"
    )

    print(
        "Hardware bridge: ENABLED"
    )

    print(
        "=============================================="
    )

    yield

    print()

    print(
        "=============================================="
    )

    print(
        "ArogyaConnect Backend Stopped"
    )

    print(
        "=============================================="
    )


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(

    title="ArogyaConnect API",

    description=(
        "Patient monitoring backend "
        "for ArogyaConnect"
    ),

    version="1.0.0",

    lifespan=lifespan
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://127.0.0.1:5500",

        "http://localhost:5500",

        "http://127.0.0.1:8000",

        "http://localhost:8000",

        "null"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# =========================================================
# AUTH
# =========================================================

app.include_router(

    auth.router,

    prefix="/api/auth"
)


# =========================================================
# PATIENTS
# =========================================================

app.include_router(

    patients.router,

    prefix="/api/patients"
)


# =========================================================
# SENSORS
# =========================================================

app.include_router(

    sensors.router,

    prefix="/api/sensors"
)


# =========================================================
# ALERTS
# =========================================================

app.include_router(

    alerts.router,

    prefix="/api/alerts"
)


# =========================================================
# EVENTS
# =========================================================

app.include_router(

    events.router,

    prefix="/api/events"
)


# =========================================================
# HARDWARE BRIDGE
#
# Existing ESP32 sends:
#
# POST /api/data
#
# Example:
#
# {
#     "temperature": 36.7,
#     "xPercent": 10,
#     "yPercent": 20,
#     "force1": 550,
#     "force2": 600,
#     "ultrasonic1": 12,
#     "ultrasonic2": 18,
#     "buzzerStatus": 0
# }
#
# =========================================================

app.include_router(

    hardware_bridge.router
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {

        "application":
            "ArogyaConnect",

        "status":
            "running",

        "environment":
            "development",

        "hardware_bridge":
            "enabled"
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():

    return {

        "status":
            "healthy",

        "hardware_bridge":
            "enabled"
    }