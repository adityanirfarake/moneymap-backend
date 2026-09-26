FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native packages (e.g. bcrypt)
RUN apk add --no-cache python3 make g++

# Copy dependency manifests and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Receive Git commit SHA from build args for deployment tracking
ARG GIT_SHA=local
ENV GIT_SHA=$GIT_SHA PORT=5000 NODE_ENV=production

# Run as non-privileged node user for security
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
