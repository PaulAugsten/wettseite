FROM node:26-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
CMD [ "pnpm", "exec", "tsx", "lib/supabase/api/scraper/rainbow-six-siege/matches_scraper.ts" ]