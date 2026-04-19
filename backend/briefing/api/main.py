from fastapi import FastAPI

from briefing.api.routes.intelligence import router as intelligence_router

app = FastAPI(title="Silent Briefing API")
app.include_router(intelligence_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
