# For client only (skip other parts for now)
FROM node:20.12.2
WORKDIR /Client
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
