# Use official Node.js LTS version as base image
FROM node:20 AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire application code to the working directory
COPY . .

# Build the Next.js application
RUN npm run build

# Use lightweight Node.js image for production
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the built application from the previous stage
COPY --from=builder /app/.next ./.next

# Expose the port Next.js app is running on
EXPOSE 3000

# Command to run the Next.js application in production mode
CMD ["npm", "start"]
