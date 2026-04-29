FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_GITHUB_OAUTH_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GITHUB_OAUTH_CLIENT_ID=$VITE_GITHUB_OAUTH_CLIENT_ID

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "build"]
