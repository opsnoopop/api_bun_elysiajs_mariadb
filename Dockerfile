# ใช้ Bun official image
FROM oven/bun:1-alpine

# Create app directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies (ถ้ามี)
RUN bun install

# Run API
# bun run src/index.ts
CMD ["bun", "src/index.ts"]
