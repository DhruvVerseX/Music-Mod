# Python Gesture Service

This service analyzes hand position and movement in three ordered stages:

1. `pose_model.py`
2. `motion_model.py`
3. `sequence_model.py`

The frontend posts recent MediaPipe landmarks to `POST /infer`. If the service is offline, the web app falls back to browser-side inference.

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8001 --reload
```

Set `NEXT_PUBLIC_GESTURE_MODEL_URL=http://127.0.0.1:8001/infer` in the Next.js app if you want to override the default endpoint.
