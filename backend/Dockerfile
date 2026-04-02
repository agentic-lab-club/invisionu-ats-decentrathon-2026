# syntax=docker/dockerfile:1.7

##############################
# Dependencies stage
##############################
FROM golang:1.25-alpine AS deps

WORKDIR /src

RUN apk add --no-cache ca-certificates tzdata && update-ca-certificates

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download -x

##############################
# Test stage (no swagger generation)
##############################
FROM deps AS test

WORKDIR /src

##############################
# Build stage
##############################
FROM deps AS builder

WORKDIR /src

ARG GEN_SWAGGER=1

COPY . .

RUN if [ "$GEN_SWAGGER" = "1" ]; then \
      go install github.com/swaggo/swag/cmd/swag@v1.8.1; \
      rm -f /src/docs/docs.go || true; \
      /go/bin/swag init -g cmd/server/main.go; \
      apk add --no-cache jq; \
      cd /src/docs; \
      jq '.host = "127.0.0.1:8080" | .schemes = ["http"]' swagger.json > swagger-local.json; \
      jq '.host = "api-stage.yourdomain.com" | .schemes = ["https", "http"]' swagger.json > swagger-stage.json; \
      jq '.host = "api.yourdomain.com" | .schemes = ["https"]' swagger.json > swagger-prod.json; \
      echo "Generated swagger-local.json"; \
      echo "Generated swagger-stage.json"; \
      echo "Generated swagger-prod.json"; \
    else \
      echo "Skipping swagger generation"; \
    fi

# Build a static binary for Linux
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /out/backend ./cmd/server

##############################
# Runtime stage
##############################
FROM alpine:3.20 AS runner

RUN addgroup -S app && adduser -S app -G app \
    && apk add --no-cache ca-certificates tzdata ffmpeg \
    && update-ca-certificates

WORKDIR /app

# Copy binary
COPY --from=builder /out/backend /app/backend

# Copy Swagger documentation (required by server for /docs endpoints)
COPY --from=builder /src/docs/ /app/docs/

# Copy configuration directory (optional; can also be mounted)
COPY config/ /app/config/

# Copy DB migrations (app expects ./db/migrations from WORKDIR /app)
COPY db/ /app/db/

# Default HTTP port (match config)
EXPOSE 8080

USER app

ENTRYPOINT ["/app/backend"]
CMD ["-config=prod"]

