FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir flask

COPY captive_portal.py .

EXPOSE 5000

CMD ["python", "captive_portal.py"]
