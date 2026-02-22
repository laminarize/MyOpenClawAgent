FROM node:18-alpine
RUN apk add --no-cache git docker-cli docker-cli-compose \
 && git config --global --add safe.directory /repo
WORKDIR /app
COPY github-webhook-sync.js ./
ENV PORT=9090
EXPOSE 9090
CMD ["node", "github-webhook-sync.js"]
