-- ============================================================
--  MyoMap 数据库结构（MySQL 8）
--  首次启动由 Spring Boot 自动执行；也可手动导入：
--    mysql -uroot -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS myomap
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE myomap;

-- ---------- 用户 ----------
CREATE TABLE IF NOT EXISTS `sys_user` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(64)  NOT NULL COMMENT '用户名',
  `password`   VARCHAR(100) NOT NULL COMMENT 'BCrypt 密码哈希',
  `email`      VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户';

-- ---------- 个人档案 ----------
CREATE TABLE IF NOT EXISTS `profile` (
  `id`         BIGINT      NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT      NOT NULL,
  `gender`     VARCHAR(10) DEFAULT 'male',
  `birthdate`  DATE        DEFAULT NULL,
  `height`     DOUBLE      DEFAULT NULL COMMENT '身高 cm',
  `weight`     DOUBLE      DEFAULT NULL COMMENT '体重 kg',
  `goal`       VARCHAR(16) DEFAULT '增肌',
  `experience` VARCHAR(16) DEFAULT '新手',
  `activity`   DOUBLE      DEFAULT 1.375,
  `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='个人档案';

-- ---------- 身体数据 ----------
CREATE TABLE IF NOT EXISTS `body_metric` (
  `id`         BIGINT   NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT   NOT NULL,
  `date`       DATE     NOT NULL,
  `weight`     DOUBLE   DEFAULT NULL,
  `body_fat`   DOUBLE   DEFAULT NULL,
  `chest`      DOUBLE   DEFAULT NULL,
  `waist`      DOUBLE   DEFAULT NULL,
  `hip`        DOUBLE   DEFAULT NULL,
  `arm`        DOUBLE   DEFAULT NULL,
  `thigh`      DOUBLE   DEFAULT NULL,
  `calf`       DOUBLE   DEFAULT NULL,
  `note`       VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='身体数据';

-- ---------- 训练计划 ----------
CREATE TABLE IF NOT EXISTS `workout_plan` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT       NOT NULL,
  `name`       VARCHAR(128) NOT NULL,
  `goal`       VARCHAR(16)  DEFAULT NULL,
  `difficulty` INT          DEFAULT 2,
  `frequency`  INT          DEFAULT 3,
  `weeks`      INT          DEFAULT 4,
  `muscles`    TEXT         COMMENT '目标部位 JSON',
  `days`       MEDIUMTEXT   COMMENT '训练日与动作 JSON',
  `source`     VARCHAR(16)  DEFAULT 'generated',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练计划';

-- ---------- 训练记录 ----------
CREATE TABLE IF NOT EXISTS `workout_log` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT       NOT NULL,
  `plan_name`    VARCHAR(128) DEFAULT NULL,
  `started_at`   DATETIME     DEFAULT NULL,
  `ended_at`     DATETIME     DEFAULT NULL,
  `duration_sec` INT          DEFAULT 0,
  `total_volume` DOUBLE       DEFAULT 0 COMMENT '总容量 kg',
  `total_sets`   INT          DEFAULT 0,
  `calories`     INT          DEFAULT 0,
  `exercises`    MEDIUMTEXT   COMMENT '动作明细 JSON',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练记录';

-- ---------- 饮食记录 ----------
CREATE TABLE IF NOT EXISTS `diet_log` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT       NOT NULL,
  `date`       DATE         NOT NULL,
  `meal`       VARCHAR(16)  DEFAULT NULL COMMENT '早餐/午餐/晚餐/加餐',
  `food_name`  VARCHAR(64)  DEFAULT NULL,
  `grams`      DOUBLE       DEFAULT NULL,
  `kcal`       DOUBLE       DEFAULT 0,
  `protein`    DOUBLE       DEFAULT 0,
  `carb`       DOUBLE       DEFAULT 0,
  `fat`        DOUBLE       DEFAULT 0,
  `raw`        VARCHAR(255) DEFAULT NULL COMMENT '原始描述 / AI 解析来源',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饮食记录';
