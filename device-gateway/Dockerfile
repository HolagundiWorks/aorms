# Esti device gateway — see docs/esti/AORMS-ESTI-MOBILE-INFERENCE (attached
# development guide) §6. Tiny single-purpose service: build once, run the
# compiled JS. Same shape as gateway/Dockerfile (jobs-gateway).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4200
CMD ["node", "dist/index.js"]
