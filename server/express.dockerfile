FROM node:24-slim

EXPOSE 3000

WORKDIR /user/app

COPY package.json ./

RUN npm install

COPY . ./

CMD ["node" , "server.js"]