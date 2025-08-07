# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install --omit=dev

# Bundle app source
COPY . .

# MODIFICATION: Use npm start to run the application
CMD [ "npm", "start" ]