from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="LegoBot")


@app.get("/", response_class=HTMLResponse)
def index():
    return "<!doctype html><title>LegoBot</title><h1>LegoBot</h1><p>Coming soon.</p>"


@app.get("/health")
def health():
    return {"status": "ok"}
