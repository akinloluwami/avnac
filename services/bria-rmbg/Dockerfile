FROM python:3.9-slim

ARG HF_TOKEN

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MODEL_DIR=/opt/models/RMBG-2.0 \
    TORCH_NUM_THREADS=1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip && pip install -r /tmp/requirements.txt

COPY download_model.py /tmp/download_model.py
RUN export HF_TOKEN && python /tmp/download_model.py

COPY app.py /app/app.py

EXPOSE 8000

CMD ["python", "app.py"]
