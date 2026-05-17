FROM docker.io/library/golang:1.24-alpine AS build
WORKDIR /app
COPY main.go .
RUN go build -o chall main.go

FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=build /app/chall /chall
EXPOSE 1337
CMD ["/chall"]
