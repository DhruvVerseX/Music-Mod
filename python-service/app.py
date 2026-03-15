from __future__ import annotations

import asyncio
from contextlib import suppress

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from engine import VocalEngineRuntime
from schemas import EngineState

app = FastAPI(title="Python Vocal Engine")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
runtime = VocalEngineRuntime()


@app.get("/state", response_model=EngineState)
def get_state() -> EngineState:
    return runtime.state.snapshot()


@app.post("/session/start", response_model=EngineState)
def start_session() -> EngineState:
    runtime.start()
    return runtime.state.snapshot()


@app.post("/session/stop", response_model=EngineState)
def stop_session() -> EngineState:
    runtime.stop()
    return runtime.state.snapshot()


@app.websocket("/ws")
async def websocket_state(websocket: WebSocket) -> None:
    await websocket.accept()

    async def sender() -> None:
        while True:
            await websocket.send_text(runtime.state.snapshot().model_dump_json())
            await asyncio.sleep(0.12)

    task = asyncio.create_task(sender())
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
