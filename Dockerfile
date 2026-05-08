FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD [ "npx", "tsx", "lib/supabase/api/scraper/rainbow-six-siege/matches_scraper.ts" ]