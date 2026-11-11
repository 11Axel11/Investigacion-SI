# Caso PERMITIDO: la etapa final declara un usuario no root.
FROM node:22-alpine AS build
RUN echo compilando

FROM node:22-alpine
COPY --from=build /etc/hostname /app/hostname
USER node
CMD ["node", "--version"]
