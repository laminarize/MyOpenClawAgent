#!/bin/bash
set -e
# Substitute SSL paths from env (loaded by docker-compose from .env) into nginx config
envsubst '${SSL_CERT_FILE} ${SSL_KEY_FILE}' \
  < /etc/nginx/sites-available/myopenclawagent.conf.template \
  > /etc/nginx/sites-available/myopenclawagent.conf
exec nginx -g "daemon off;"
