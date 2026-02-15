# 🚀 Guia de Deploy - FinFlow (LAMP)

**URL Final:** `https://solutotecnologia.com.br/Site-Soluto/FinFlow/`

---

## Passo a Passo (após `git pull`)

### 1. Entrar na pasta do projeto
```bash
cd /var/www/html/Site-Soluto/FinFlow
```

### 2. Instalar dependências do Node
```bash
npm install
```

### 3. Fazer o build de produção
```bash
npx vite build
```
Isso gera a pasta `dist/` com os arquivos otimizados.

### 4. Copiar os arquivos do build para a raiz do projeto
```bash
cp -r dist/* .
```
Resultado: `index.html` e `assets/` ficam na raiz de `FinFlow/`, lado a lado com `api/`.

### 5. Importar o banco de dados MySQL
```bash
mysql -u SEU_USUARIO -p SEU_BANCO < api/schema.sql
```
> ⚠️ Só precisa fazer isso **na primeira vez** ou quando o schema mudar.

### 6. Configurar as credenciais do banco
Edite o arquivo `api/config.php` e altere as variáveis:
```php
$dbHost = 'localhost';        // Host do MySQL
$dbName = 'SEU_BANCO';       // Nome do banco
$dbUser = 'SEU_USUARIO';     // Usuário MySQL
$dbPass = 'SUA_SENHA';       // Senha MySQL
$jwtSecret = 'CHAVE_SECRETA_AQUI';  // Qualquer string longa e aleatória
```

### 7. Verificar permissões
```bash
chmod 644 api/config.php
chmod 644 .htaccess
chmod 644 api/.htaccess
```

### 8. Testar!
Acesse no navegador:
```
https://solutotecnologia.com.br/Site-Soluto/FinFlow/index.html
```

---

## Estrutura Final no Servidor

```
/var/www/html/Site-Soluto/FinFlow/
├── .htaccess              ← Roteamento + segurança
├── index.html             ← App React (copiado do dist/)
├── assets/                ← JS/CSS do Vite (copiado do dist/)
│   ├── index-XXXX.css
│   ├── index-XXXX.js
│   ├── vendor-XXXX.js
│   └── charts-XXXX.js
├── api/                   ← Backend PHP
│   ├── .htaccess          ← Proteção do config
│   ├── config.php         ← Credenciais DB + JWT
│   ├── schema.sql         ← Schema MySQL
│   ├── auth.php
│   ├── accounts.php
│   ├── cards.php
│   ├── categories.php
│   ├── transactions.php
│   ├── budget.php
│   ├── users.php
│   └── admin.php
├── src/                   ← Bloqueado pelo .htaccess
├── node_modules/          ← Bloqueado pelo .htaccess
├── package.json           ← Bloqueado pelo .htaccess
└── dist/                  ← Bloqueado pelo .htaccess
```

---

## Atualizações Futuras (Resumo Rápido)

```bash
cd /var/www/html/Site-Soluto/FinFlow
git pull
npm install
npx vite build
cp -r dist/* .
```

---

## Credenciais de Admin Padrão

| Campo  | Valor                            |
|--------|----------------------------------|
| Email  | igor.resende92@hotmail.com       |
| Senha  | 88495397                         |

> ⚠️ Troque a senha após o primeiro login em produção!
