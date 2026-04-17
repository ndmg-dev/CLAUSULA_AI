FROM node:20-alpine

WORKDIR /app

# Copiar apenas manifests para cache de layer do npm
COPY package.json ./
COPY package-lock.json* ./

# Instalar dependências e limpar cache na mesma camada
RUN npm install && npm cache clean --force

# Copia o código-fonte (node_modules do host bloqueado pelo .dockerignore)
COPY . .

EXPOSE 5173

# Vite dev server com host 0.0.0.0 para funcionar com Docker port mapping
CMD ["npm", "run", "dev", "--", "--host"]
