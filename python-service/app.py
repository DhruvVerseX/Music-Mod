from __future__ import annotations

from fastapi import FastAPI

from models.motion_model import MotionModel
from models.pose_model import PoseModel
from models.sequence_model import SequenceModel
from schemas import InferenceRequest, InferenceResponse

app = FastAPI(title="Gesture Motion Service")

pose_model = PoseModel()
motion_model = MotionModel()
sequence_model = SequenceModel()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/infer", response_model=InferenceResponse)
def infer(payload: InferenceRequest) -> InferenceResponse:
    if not payload.frames:
        return InferenceResponse(
            gesture="none",
            confidence=0.0,
            tilt=0.0,
            label="No frames provided",
            movement="still",
            position={"horizontal": "center", "vertical": "mid"},
            source="python-live",
        )

    latest_frame = payload.frames[-1]
    pose = None
    motion = None

    for step in payload.model_order:
        if step == "pose":
            pose = pose_model.predict(latest_frame)
        elif step == "motion":
            motion = motion_model.predict(payload.frames)
        elif step == "sequence":
            pose = pose or pose_model.predict(latest_frame)
            motion = motion or motion_model.predict(payload.frames)
            return sequence_model.predict(pose, motion)

    pose = pose or pose_model.predict(latest_frame)
    motion = motion or motion_model.predict(payload.frames)
    return sequence_model.predict(pose, motion)
