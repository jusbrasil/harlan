FROM node:8 as builder

WORKDIR /usr/local/src/harlan

COPY package.json package-lock.json ./
RUN npm install -g gulp bower
RUN npm install

COPY bower.json ./
RUN bower install

RUN apt-get update && \
    apt-get install -y \
    graphicsmagick \
    ruby \
    ruby-compass

COPY . .
RUN npm build
RUN gulp build

# ---
FROM nginx:1.21.6

COPY --from=builder /usr/local/src/harlan/Server/web /usr/local/src/harlan/Server/web
COPY nginx.conf /etc/nginx/
