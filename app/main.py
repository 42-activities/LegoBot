from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="LegoNego")


@app.get("/", response_class=HTMLResponse)
def index():
    return "<!doctype html><title>LegoNego</title><h1>LegoNego</h1><p>Coming soon.</p>"


@app.get("/health")
def health():
    return {"status": "ok"}
