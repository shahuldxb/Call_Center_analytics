# Use the official Node.js image
FROM node:20.12.2

# Set the working directory for the server
WORKDIR /server

# Copy package.json and package-lock.json from the root
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire server folder into the container
COPY . .

# Expose the port used by the server
EXPOSE 5001

# Start the server using npm
CMD ["npm", "start"]
