FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=
ARG VITE_SUPPORT_EMAIL=
ARG VITE_SUPPORT_WHATSAPP=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL
ENV VITE_SUPPORT_WHATSAPP=$VITE_SUPPORT_WHATSAPP
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend .
RUN npm run build

FROM nginx:1.29-alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
