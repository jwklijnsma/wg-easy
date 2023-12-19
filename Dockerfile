FROM docker.io/library/node:18-alpine AS build_node_modules
LABEL maintainer="janwiebe@janwiebe.eu"

# Copy Web UI
COPY src/ /app/
WORKDIR /app
RUN npm ci --production


FROM ubuntu:22.04
LABEL maintainer="janwiebe@janwiebe.eu"

# Install necessary packages
RUN apt-get update 
RUN apt-get install -y nodejs npm

COPY --from=build_node_modules /app /app

# Move node_modules one directory up
RUN mv /app/node_modules /node_modules

# Install necessary packages
RUN apt-get install -y curl
RUN curl -s https://packagecloud.io/install/repositories/crowdsec/crowdsec/script.deb.sh | bash
RUN apt-get update && \
    apt-get install -y \
    iproute2 \
    wireguard \
    wireguard-tools \
    dumb-init \
    crowdsec \
    iptables && \
    rm -rf /var/lib/apt/lists/*

RUN modprobe wireguard
RUN echo module wireguard +p > /sys/kernel/debug/dynamic_debug/control
# Enable this to run `npm run serve`
RUN npm i -g nodemon

# Expose Ports
EXPOSE 51820/udp
EXPOSE 51821/tcp

# Set Environment
ENV DEBUG=Server,WireGuard

# Run Web UI
WORKDIR /app
CMD ["/usr/bin/dumb-init", "node", "server.js"]
