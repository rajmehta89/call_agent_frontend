# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the project
COPY . .

# Build the Next.js project
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "start"]
