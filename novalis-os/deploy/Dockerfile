FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app/novalis-os
COPY novalis-os/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && groupadd -g 10001 novalis && useradd -u 10001 -g 10001 -M novalis
COPY novalis-os/novalis_os ./novalis_os
COPY novalis-os/web ./web
COPY novalisai/assets/logo.webp novalisai/assets/N_novalis.png novalisai/assets/manrope-latin.woff2 novalisai/assets/instrument-serif-latin.woff2 /app/novalisai/assets/
USER 10001:10001
EXPOSE 8000
CMD ["gunicorn","--bind","0.0.0.0:8000","--workers","2","--threads","2","--timeout","30","novalis_os:create_app()"]
