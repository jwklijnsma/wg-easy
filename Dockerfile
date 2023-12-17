LABEL maintainer="janwiebe@janwiebe.eu"
# Use a specific Ubuntu version with Node.js 14
FROM node:14-buster AS build_node_modules

# Copy Web UI
COPY src/ /app/
WORKDIR /app
RUN npm ci --production

# Create a new image with a slim Ubuntu base
FROM ubuntu:22.04

# Copy build result from the previous stage
COPY --from=build_node_modules /app /app

# Move node_modules one directory up
RUN mv /app/node_modules /node_modules

# Install necessary packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wireguard-tools \
    dumb-init && \
    rm -rf /var/lib/apt/lists/*

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
