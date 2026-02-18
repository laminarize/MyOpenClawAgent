FROM nginx:1.25-alpine

# Install security utilities
RUN apk add --no-cache \
    openssl \
    bash \
    curl

# Create directories
RUN mkdir -p /etc/nginx/ssl /etc/nginx/sites-available /etc/nginx/sites-enabled

# Copy nginx configuration (conf is a template; entrypoint substitutes SSL paths from env)
COPY nginx.conf /etc/nginx/nginx.conf
COPY sites/myopenclawagent.conf /etc/nginx/sites-available/myopenclawagent.conf.template

# Enable site (entrypoint writes myopenclawagent.conf from template at runtime)
RUN ln -sf /etc/nginx/sites-available/myopenclawagent.conf /etc/nginx/sites-enabled/

# Remove default site
RUN rm -f /etc/nginx/sites-enabled/default

# Entrypoint substitutes SSL_CERT_FILE/SSL_KEY_FILE from .env into config, then starts nginx
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
