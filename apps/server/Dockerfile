FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Hoisted node_modules avoids pnpm symlink issues in Docker
RUN echo "node-linker=hoisted" > .npmrc

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/server/package.json apps/server/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/server apps/server

EXPOSE 3002

CMD ["node", "--import", "tsx", "apps/server/src/index.ts"]
