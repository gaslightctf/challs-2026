FROM golang:1.24-alpine AS build
WORKDIR /app
COPY main.go .
RUN go build -o chall main.go

FROM alpine:3.21
COPY --from=build /app/chall /chall
EXPOSE 1337
CMD ["/chall"]
