-- Migration: Add Content Moderation Tables
-- Version: 001
-- Date: 2024-06-05
-- Description: Create tables for content moderation system

-- Table: content_reports
CREATE TABLE IF NOT EXISTS content_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    reporter_id INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_message_id (message_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_reporter_id (reporter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: content_moderation_logs
CREATE TABLE IF NOT EXISTS content_moderation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,
    moderator_id INT NOT NULL,
    reason TEXT,
    report_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES content_reports(id) ON DELETE SET NULL,

    INDEX idx_message_id (message_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    INDEX idx_moderator_id (moderator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration history
CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO migrations (name) VALUES ('001_add_moderation_tables');
