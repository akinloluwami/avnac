from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import hf_hub_download

MODEL_REPO = os.environ.get("RMBG_MODEL_REPO", "briaai/RMBG-2.0")
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/opt/models/RMBG-2.0"))
HF_TOKEN = os.environ.get("HF_TOKEN")

FILES = (
    ".gitattributes",
    "BiRefNet_config.py",
    "README.md",
    "birefnet.py",
    "config.json",
    "model.safetensors",
    "preprocessor_config.json",
)


def main() -> None:
    if not HF_TOKEN:
        raise SystemExit(
            "HF_TOKEN is required at build time to download the gated briaai/RMBG-2.0 model."
        )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    for filename in FILES:
        path = hf_hub_download(
            repo_id=MODEL_REPO,
            filename=filename,
            token=HF_TOKEN,
            local_dir=str(MODEL_DIR),
        )
        print(f"Downloaded {filename} -> {path}", flush=True)


if __name__ == "__main__":
    main()
