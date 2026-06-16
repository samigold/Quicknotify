# 1. Use official Node.js image
FROM node:20-alpine

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy package files first
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the app
COPY . .

# 6. Expose the app port
EXPOSE 3001

# 7. Start the app
CMD ["node", "index.js"]