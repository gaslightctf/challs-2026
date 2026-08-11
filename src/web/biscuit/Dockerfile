# python3.11 to match gcr.io/distroless/python3-debian12
FROM python:3.11-slim-bookworm AS build
WORKDIR /usr/src/app

# install dependencies into a standalone directory we can copy wholesale
COPY requirements.txt .
RUN pip install --no-cache-dir --no-compile --target /deps -r requirements.txt

FROM gcr.io/distroless/python3-debian12:nonroot
WORKDIR /chall

COPY --from=build /deps /deps
COPY app.py .
COPY templates ./templates
COPY static ./static

ENV PYTHONPATH=/deps \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
EXPOSE 8080

# the distroless entrypoint is python3, so hand it the gunicorn console script
CMD ["/deps/bin/gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "app:app"]
