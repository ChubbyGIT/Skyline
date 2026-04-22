from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Skyline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "healthy", "message": "Skyline API is running"}

@app.get("/analysis")
async def analysis_placeholder():
    return {"message": "Advanced analysis logic will be implemented here in future versions."}
