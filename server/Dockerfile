# Use lightweight Node.js image for production
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./
RUN npm install

COPY . . 
RUN npm run build

# Expose the port Next.js app is running on
EXPOSE 3000

# Command to run the Next.js application in production mode
CMD ["npm", "start"]
