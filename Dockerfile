LABEL maintainer="janwiebe@janwiebe.eu"
# Create a new image with a slim Ubuntu base
FROM ubuntu:22.04

# Install necessary packages
RUN apt-get update 
RUN apt-get install -y nodejs npm

# Set the working directory
WORKDIR /app_build_node_modules

# Copy the Web UI source code into the container
COPY src/ .

# Install production dependencies
RUN npm ci --production

# Copy build result from the previous stage
COPY /app_build_node_modules /app

# Move node_modules one directory up
RUN mv /app/node_modules /node_modules

# Install necessary packages
RUN apt-get update && \
    apt-get install -y \
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
