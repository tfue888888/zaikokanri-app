SET NAMES utf8mb4;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id)
);

-- 2. products
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    jan_code VARCHAR(13) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_jan_code (jan_code),
    INDEX idx_product_name (product_name),
    INDEX idx_stock (stock)
);

-- 3. stock_logs
CREATE TABLE IF NOT EXISTS stock_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    action VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_created_at (created_at)
);

-- 4. operation_logs
CREATE TABLE IF NOT EXISTS operation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    product_id INT NULL,
    product_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- 5. purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    expected_date DATE NULL,
    status ENUM('未入荷', '入荷済', 'キャンセル') NOT NULL DEFAULT '未入荷',
    order_note VARCHAR(255) NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_at DATETIME NULL,
    INDEX idx_product_id (product_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 初期ユーザー
INSERT INTO users (employee_id, name, password, role, created_at)
VALUES
    ('EMP001', '田中', '$2b$10$fsNyt7LVEl6S3ZpcMU8Kxu13yamNm0Da.3RPuWOjsrkymxu.t.I/q', 'admin', NOW()),
    ('EMP002', '佐藤', '$2b$10$RrL6kG1FdD8rA9Yr7E08COuuBrl6nZO9.MHmkMrW5Sn4P9yr3SGIW', 'employee', NOW()),
    ('EMP003', '鈴木', '$2b$10$u0gqNGVTX5PteUVcbjY.j.aTosR1T0iS.l1JhhwD5SpA3WL80Q9Li', 'employee', NOW());