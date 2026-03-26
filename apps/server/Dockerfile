FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN npm install -g tsx
WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

COPY apps/server/entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3002

ENTRYPOINT ["/app/entrypoint.sh"]
