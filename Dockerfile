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

# Your app binds to the port provided by Cloud Run
# No need to specify a port here, Cloud Run handles it.

# Define the command to run your app
CMD [ "node", "index.js" ]