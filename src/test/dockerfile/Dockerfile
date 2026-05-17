FROM docker.io/library/golang:1.24-alpine AS builder
WORKDIR /app
COPY main.go .
RUN go build -o chall main.go

FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=builder /app/chall /chall
EXPOSE 1337
CMD ["/chall"]
