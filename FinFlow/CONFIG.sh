#!/bin/bash
# =====================================================================
#  FinFlow - Script de Configuração do Servidor Linux (VPS)
# =====================================================================
#  Este script configura automaticamente a sua máquina Linux para
#  servir a aplicação FinFlow como um PWA.
#
#  REQUISITOS:
#    - Ubuntu 20.04+ ou Debian 11+
#    - Acesso root (sudo)
#
#  COMO USAR:
#    1. Copie TODA a pasta 'dist' para o seu servidor.
#    2. Acesse o servidor via SSH.
#    3. Navegue até a pasta dist:  cd /caminho/para/dist
#    4. Dê permissão:              chmod +x CONFIG.sh
#    5. Execute:                   sudo ./CONFIG.sh
#
#  O QUE ESTE SCRIPT FAZ:
#    - Instala o Nginx (se não estiver instalado)
#    - Copia os arquivos da aplicação para /var/www/finflow
#    - Configura o Nginx para servir a aplicação como SPA/PWA
#    - Habilita GZIP para performance
#    - Configura headers de cache para assets estáticos
#    - Reinicia o Nginx
# =====================================================================

set -e  # Exit on any error

# ---- Colors ----
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       FinFlow - Configuração do Servidor     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---- Check root ----
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Execute este script como root (sudo ./CONFIG.sh)${NC}"
    exit 1
fi

# ---- Get domain or IP ----
read -p "Digite o domínio ou IP do servidor (ex: finflow.com ou 192.168.1.100): " SERVER_NAME
if [ -z "$SERVER_NAME" ]; then
    SERVER_NAME="_"
    echo -e "${YELLOW}⚠️  Nenhum domínio informado. Usando configuração padrão (aceita qualquer host).${NC}"
fi

# ---- Step 1: Install Nginx ----
echo ""
echo -e "${YELLOW}📦 [1/5] Verificando Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    echo "Instalando Nginx..."
    apt update -y
    apt install -y nginx
    echo -e "${GREEN}✅ Nginx instalado com sucesso!${NC}"
else
    echo -e "${GREEN}✅ Nginx já está instalado.${NC}"
fi

# ---- Step 2: Create app directory ----
echo ""
echo -e "${YELLOW}📁 [2/5] Copiando arquivos da aplicação...${NC}"
APP_DIR="/var/www/finflow"

# Create directory if it doesn't exist
mkdir -p "$APP_DIR"

# Copy all files from the current directory (dist) to the app directory
# Exclude this script itself
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rsync -av --exclude='CONFIG.sh' "$SCRIPT_DIR/" "$APP_DIR/"

# Set proper permissions
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

echo -e "${GREEN}✅ Arquivos copiados para $APP_DIR${NC}"

# ---- Step 3: Configure Nginx ----
echo ""
echo -e "${YELLOW}⚙️  [3/5] Configurando Nginx...${NC}"

NGINX_CONF="/etc/nginx/sites-available/finflow"

cat > "$NGINX_CONF" << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name SERVER_NAME_PLACEHOLDER;

    root /var/www/finflow;
    index index.html;

    # ---- GZIP Compression ----
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/rss+xml
        application/atom+xml
        image/svg+xml;

    # ---- Security Headers ----
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ---- Static Assets (JS, CSS, Images) ----
    # Cache for 1 year (hashed filenames change on each build)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # ---- Service Worker ----
    # Never cache the service worker itself
    location = /sw.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

    # ---- Manifest ----
    location = /manifest.webmanifest {
        expires 1d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # ---- SPA Fallback ----
    # All routes redirect to index.html (React Router handles them)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_EOF

# Replace placeholder with actual server name
sed -i "s|SERVER_NAME_PLACEHOLDER|$SERVER_NAME|g" "$NGINX_CONF"

echo -e "${GREEN}✅ Nginx configurado!${NC}"

# ---- Step 4: Enable site ----
echo ""
echo -e "${YELLOW}🔗 [4/5] Ativando site...${NC}"

# Remove default site if it exists
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Create symlink to enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/finflow

# Test Nginx configuration
if nginx -t 2>/dev/null; then
    echo -e "${GREEN}✅ Configuração do Nginx validada!${NC}"
else
    echo -e "${RED}❌ Erro na configuração do Nginx. Verifique manualmente.${NC}"
    nginx -t
    exit 1
fi

# ---- Step 5: Restart Nginx ----
echo ""
echo -e "${YELLOW}🔄 [5/5] Reiniciando Nginx...${NC}"
systemctl restart nginx
systemctl enable nginx

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ CONFIGURAÇÃO CONCLUÍDA!          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📂 Arquivos em:  ${YELLOW}$APP_DIR${NC}"
echo -e "  🌐 Acesse em:    ${YELLOW}http://$SERVER_NAME${NC}"
echo ""
echo -e "  ${YELLOW}💡 DICA: Para adicionar HTTPS (SSL), execute:${NC}"
echo -e "     sudo apt install certbot python3-certbot-nginx"
echo -e "     sudo certbot --nginx -d $SERVER_NAME"
echo ""
