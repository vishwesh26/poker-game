FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose the port Railway/Fly.io uses
EXPOSE 8080

# Start with ts-node (no build step needed)
CMD ["npm", "start"]
