-- =====================================================================
--  FinFlow - Schema MySQL
--  Execute: mysql -u root -p finflow < schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS finflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE finflow;

-- ---- Users ----
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(64) NOT NULL,  -- SHA-256 hex
    photo LONGTEXT DEFAULT NULL,          -- base64 data URL
    is_premium TINYINT(1) NOT NULL DEFAULT 0,
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---- Accounts ----
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('checking','savings','wallet','other') NOT NULL DEFAULT 'checking',
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT '#00f3ff',
    icon VARCHAR(50) NOT NULL DEFAULT 'Wallet',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Credit Cards ----
CREATE TABLE IF NOT EXISTS credit_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_day TINYINT NOT NULL DEFAULT 1,
    due_day TINYINT NOT NULL DEFAULT 10,
    color VARCHAR(20) NOT NULL DEFAULT '#7c3aed',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Categories ----
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'MoreHorizontal',
    type ENUM('income','expense') NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#64748b',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Transactions ----
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('income','expense','transfer') NOT NULL,
    date DATE NOT NULL,
    account_id INT NOT NULL,
    to_account_id INT DEFAULT NULL,
    credit_card_id INT DEFAULT NULL,
    category_id INT NOT NULL,
    is_recurring TINYINT(1) NOT NULL DEFAULT 0,
    recurrence_count INT DEFAULT NULL,
    recurrence_group_id VARCHAR(50) DEFAULT NULL,
    installment_current INT DEFAULT NULL,
    installment_total INT DEFAULT NULL,
    is_realized TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, date),
    INDEX idx_recurrence (recurrence_group_id)
) ENGINE=InnoDB;

-- ---- Budget Goals ----
CREATE TABLE IF NOT EXISTS budget_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    month VARCHAR(7) NOT NULL,  -- 'YYYY-MM'
    limit_amount DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_cat_month (user_id, category_id, month)
) ENGINE=InnoDB;

-- ---- Seed: Admin User ----
-- Password: 88495397 hashed with SHA-256
INSERT IGNORE INTO users (name, email, password_hash, is_premium, is_admin)
VALUES (
    'Igor Resende',
    'igor.resende92@hotmail.com',
    'ddf500e06dede340a3ad63b6e0c4abeae78125b530c954ea2d1e04124bd33678',
    1,
    1
);

-- ---- Seed: Default Categories (for admin user) ----
INSERT IGNORE INTO categories (user_id, name, icon, type, color)
SELECT u.id, c.name, c.icon, c.type, c.color
FROM users u
CROSS JOIN (
    SELECT 'Salário' AS name, 'Banknote' AS icon, 'income' AS type, '#2ed573' AS color
    UNION ALL SELECT 'Freelance', 'Laptop', 'income', '#00f3ff'
    UNION ALL SELECT 'Investimentos', 'TrendingUp', 'income', '#7c3aed'
    UNION ALL SELECT 'Outros', 'Plus', 'income', '#64748b'
    UNION ALL SELECT 'Alimentação', 'UtensilsCrossed', 'expense', '#ff6b6b'
    UNION ALL SELECT 'Transporte', 'Car', 'expense', '#ffa502'
    UNION ALL SELECT 'Moradia', 'Home', 'expense', '#1e90ff'
    UNION ALL SELECT 'Saúde', 'Heart', 'expense', '#ff4757'
    UNION ALL SELECT 'Educação', 'GraduationCap', 'expense', '#2ed573'
    UNION ALL SELECT 'Lazer', 'Gamepad2', 'expense', '#ff00ff'
    UNION ALL SELECT 'Assinaturas', 'CreditCard', 'expense', '#00f3ff'
    UNION ALL SELECT 'Compras', 'ShoppingBag', 'expense', '#f472b6'
    UNION ALL SELECT 'Outros', 'MoreHorizontal', 'expense', '#64748b'
) c
WHERE u.email = 'igor.resende92@hotmail.com';
