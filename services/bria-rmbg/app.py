from __future__ import annotations

import io
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import torch
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from PIL import Image, ImageOps
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

LOGGER = logging.getLogger("bria-rmbg-railway")

MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/opt/models/RMBG-2.0"))
MODEL_NAME = os.environ.get("RMBG_MODEL_NAME", "briaai/RMBG-2.0")
TARGET_SIZE = int(os.environ.get("RMBG_TARGET_SIZE", "1024"))
TORCH_THREADS = max(1, int(os.environ.get("TORCH_NUM_THREADS", "1")))
DEVICE = os.environ.get("RMBG_DEVICE", "cpu")

transform_image = transforms.Compose(
    [
        transforms.Resize((TARGET_SIZE, TARGET_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]
)

model: Optional[torch.nn.Module] = None


def load_model() -> torch.nn.Module:
    if not MODEL_DIR.exists():
        raise RuntimeError(f"Model directory does not exist: {MODEL_DIR}")

    torch.set_num_threads(TORCH_THREADS)
    LOGGER.info("Loading BRIA RMBG model from %s", MODEL_DIR)

    loaded_model = AutoModelForImageSegmentation.from_pretrained(
        str(MODEL_DIR),
        trust_remote_code=True,
        local_files_only=True,
    ).to(DEVICE)
    loaded_model.eval()
    return loaded_model


def render_masked_png(image_bytes: bytes) -> bytes:
    if model is None:
        raise RuntimeError("Model is not loaded")

    image = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
    original_size = image.size
    input_tensor = transform_image(image).unsqueeze(0).to(DEVICE)

    with torch.inference_mode():
        output = model(input_tensor)

    prediction = output[-1] if isinstance(output, (list, tuple)) else output
    if isinstance(prediction, (list, tuple)):
        prediction = prediction[-1]
    if hasattr(prediction, "logits"):
        prediction = prediction.logits

    mask = prediction.sigmoid().cpu()[0].squeeze(0)
    mask_image = transforms.ToPILImage()(mask).resize(original_size, Image.Resampling.LANCZOS)

    result = image.copy()
    result.putalpha(mask_image)

    buffer = io.BytesIO()
    result.save(buffer, format="PNG")
    return buffer.getvalue()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global model
    model = load_model()
    yield


app = FastAPI(title="BRIA RMBG 2.0 Service", lifespan=lifespan)


@app.get("/")
async def root() -> JSONResponse:
    return JSONResponse(
        {
            "name": "bria-rmbg-railway",
            "model": MODEL_NAME,
            "ready": model is not None,
            "removeEndpoint": "/api/remove",
            "healthEndpoint": "/health",
        }
    )


@app.get("/health")
async def health() -> JSONResponse:
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return JSONResponse({"status": "ok", "model": MODEL_NAME})


@app.post("/api/remove")
@app.post("/remove-background")
async def remove_background(request: Request) -> Response:
    form = await request.form()
    upload = form.get("file")

    if upload is None or not hasattr(upload, "read"):
        raise HTTPException(status_code=400, detail="Expected multipart/form-data with a file field.")

    image_bytes = await upload.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        png_bytes = render_masked_png(image_bytes)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - surfaced in logs
        LOGGER.exception("Background removal failed")
        raise HTTPException(status_code=500, detail="Background removal failed.") from exc

    return Response(content=png_bytes, media_type="image/png")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
