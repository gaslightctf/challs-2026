# too lazy to nixify gcc-ia16
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y software-properties-common && \
    add-apt-repository ppa:tkchia/build-ia16 && \
    apt-get update && \
    apt-get install -y gcc-ia16-elf python3 && \
    rm -rf /var/lib/apt/lists/*
