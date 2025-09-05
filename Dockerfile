# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies first (for better caching)
COPY package*.json ./
RUN npm install --production

# Copy the rest of your code
COPY . .

# Expose your app port (adjust if needed)
EXPOSE 3000

# Set environment variable for production
ENV NODE_ENV=production

# Start the app
CMD ["node", "server.js"]