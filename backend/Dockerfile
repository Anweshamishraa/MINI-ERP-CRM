FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npx prisma db push
RUN npm run prisma:seed
EXPOSE 5000
CMD ["npm","run","dev"]
