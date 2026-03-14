# Python Vocal Engine

This service owns:

- microphone capture
- live output monitoring to speakers / earpiece
- camera-based hand tracking
- gesture-to-effect switching
- websocket state updates for the Next.js dashboard

## Start

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8001 --reload
```

## Frontend

The web app is UI-only. By default it connects to:

- `http://127.0.0.1:8001/state`
- `ws://127.0.0.1:8001/ws`

Override with:

- `NEXT_PUBLIC_ENGINE_HTTP_URL`
- `NEXT_PUBLIC_ENGINE_WS_URL`

## Notes

- Real-time monitoring happens locally in Python, not through the browser.
- Effects are lightweight approximations tuned for low-latency local use.
- Use headphones or earpieces to avoid speaker feedback.
