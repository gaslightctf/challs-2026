FROM postgres:18-alpine

ENV POSTGRES_USER messageboard
ENV POSTGRES_PASSWORD 04433efaf902245f

COPY messageboard.sql /docker-entrypoint-initdb.d/
