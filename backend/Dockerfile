FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY backend/src ./src
# JSON data lives in a named volume, never in the image
VOLUME ["/app/data"]
ENV DATA_DIR=/app/data
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "src/server.js"]
