FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir flask

COPY captive_portal.py .

ENV FLAG=sql-1nj3ction-b4e6acb1a1159a1f8d69d766999d3af5

EXPOSE 5000

CMD ["python", "captive_portal.py"]
