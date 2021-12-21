FROM node:lts-alpine

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY ${HTTP_PROXY}
ENV HTTPS_PROXY ${HTTPS_PROXY}
ENV NO_PROXY ${NO_PROXY}
ENV http_proxy ${HTTP_PROXY}
ENV https_proxy ${HTTPS_PROXY}
ENV no_proxy ${NO_PROXY}

WORKDIR /usr/src/app

# Package 'LatteArt Repository'
COPY *.js ./
COPY *.json ./
COPY src/ ./src/
COPY tests/ ./tests/
COPY yarn.lock ./
COPY externals/ ./externals/
RUN yarn install
RUN yarn typescript-json-validator src/lib/settings/Settings.ts
RUN yarn typescript-json-validator src/lib/settings/DeviceSettings.ts
RUN yarn package:win
# RUN yarn package:mac

CMD [ "cp", "-rp", "./dist/latteart-repository", "./data"]
