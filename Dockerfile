FROM node:26-bookworm-slim AS dependencies

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:26-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN mkdir -p database logs && chown node:node database logs

USER node
EXPOSE 3001

CMD ["sh", "-c", "node scripts/createBins.js && exec node server/server.js"]