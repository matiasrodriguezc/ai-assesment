
FROM node:20-slim AS build

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /usr/src/app/dist ./dist

COPY --from=build /usr/src/app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/index.js"]