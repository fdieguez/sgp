#!/bin/sh
cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  API_URL: "${VITE_API_URL:-http://localhost:8080}"
};
EOF
