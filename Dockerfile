FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
RUN chmod +x docker/entrypoint.sh
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "docker/entrypoint.sh"]
