# One image serves both the Go API and the built SPA, so shared buyer links and
# the injected per-route SEO meta come from a single origin. Render's native Go
# runtime has no Node, hence the multi-stage build.

FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Vite bakes these at build time; empty API base means "same origin as the SPA".
ARG VITE_SITE_URL=https://carthedge.in
ARG VITE_API_BASE_URL=
ENV VITE_SITE_URL=$VITE_SITE_URL VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM golang:1.23-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -o /server ./cmd/server

FROM alpine:3.20
# ca-certificates: outbound TLS to Neon, Meta Graph, Razorpay, SMTP
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend /server /app/server
COPY --from=frontend /app/frontend/dist /app/frontend/dist
ENV FRONTEND_DIR=/app/frontend/dist
# Render routes to whatever port the process opens; HTTP_PORT can override.
ENV HTTP_PORT=10000
EXPOSE 10000
CMD ["/app/server"]
