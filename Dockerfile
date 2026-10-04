FROM node:24-alpine

WORKDIR /app
COPY package.json ./
COPY server ./server
COPY extension ./extension
ENV HOST=0.0.0.0 PORT=8000

EXPOSE 8000
CMD ["node", "server/server.js"]
