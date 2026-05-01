FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    U2NET_HOME=/root/.u2net

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl libglib2.0-0 libgomp1 && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip && \
    pip install "rembg[cpu,cli]==2.0.75"

COPY entrypoint.sh /usr/local/bin/rembg-entrypoint
RUN chmod +x /usr/local/bin/rembg-entrypoint

EXPOSE 7000

ENTRYPOINT ["rembg-entrypoint"]
CMD ["s", "--host", "0.0.0.0", "--port", "7000", "--log_level", "info", "--no-ui"]
