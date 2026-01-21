# Stage 1: Build the application
FROM node:20-slim AS build

# Instalar OpenSSL (Necesario para que Prisma genere los binarios correctos)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /usr/src/app

COPY package*.json ./
# Instala TODO (incluyendo devDependencies para poder compilar)
RUN npm install

COPY . .

# Genera el cliente de Prisma (crea la carpeta node_modules/.prisma)
RUN npx prisma generate

# Compila TS a JS
RUN npm run build

# ----------------------------------------------

# Stage 2: Create the production image
FROM node:20-slim

# Instalar OpenSSL en producción también (Runtime requirement)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /usr/src/app

COPY package*.json ./
# Instala solo dependencias de producción (ahorra espacio)
RUN npm install --omit=dev

# 👇 EL FIX CRÍTICO: Copiamos el cliente generado del Stage 1
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Copiamos el código compilado
COPY --from=build /usr/src/app/dist ./dist
# Copiamos la carpeta prisma (útil si quieres correr migraciones en deploy, aunque opcional si solo usas el cliente)
COPY --from=build /usr/src/app/prisma ./prisma

EXPOSE 3000

# Usar node directo maneja mejor las señales de apagado (SIGTERM) que npm
CMD ["node", "dist/index.js"]