CREATE DATABASE IF NOT EXISTS safe_exchange
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE safe_exchange;

CREATE TABLE User (
    id            CHAR(36)        NOT NULL                    COMMENT 'Khóa chính UUID',
    walletAddress VARCHAR(42)     NOT NULL                    COMMENT 'Địa chỉ ví Ethereum (0x...)',
    role          VARCHAR(20)     NOT NULL DEFAULT 'BUYER'    COMMENT 'Vai trò: SELLER | BUYER | BOTH',
    createdAt     DATETIME        NOT NULL DEFAULT NOW()      COMMENT 'Thời điểm tạo tài khoản',

    CONSTRAINT pk_user         PRIMARY KEY (id),
    CONSTRAINT uq_wallet       UNIQUE      (walletAddress),
    CONSTRAINT ck_user_role    CHECK       (role IN ('SELLER', 'BUYER', 'BOTH'))
) ENGINE=InnoDB
  COMMENT='Tài khoản người dùng tham gia hệ thống';

CREATE TABLE Trade (
    id             INT             NOT NULL AUTO_INCREMENT     COMMENT 'Khóa chính tự tăng',
    sellerId       CHAR(36)        NOT NULL                    COMMENT 'FK → User (người bán)',
    buyerId        CHAR(36)            NULL                    COMMENT 'FK → User (người mua, nullable khi chưa có)',
    safeAddress    VARCHAR(42)     NOT NULL                    COMMENT 'Địa chỉ Safe multisig được rao bán',
    escrowAmount   DECIMAL(36,18)  NOT NULL                    COMMENT 'Số ETH ký quỹ yêu cầu',
    nonceSnapshot  VARCHAR(78)         NULL                    COMMENT 'Nonce snapshot của Safe tại thời điểm arm',
    status         VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'    COMMENT 'Trạng thái: DRAFT|LISTED|ARMED|FUNDED|COMPLETED|CANCELLED|EXPIRED',
    txHashDeposit  VARCHAR(66)         NULL                    COMMENT 'Tx hash giao dịch ký quỹ on-chain',
    txHashRelease  VARCHAR(66)         NULL                    COMMENT 'Tx hash giao dịch giải ngân on-chain',
    createdAt      DATETIME        NOT NULL DEFAULT NOW()      COMMENT 'Thời điểm tạo giao dịch',
    updatedAt      DATETIME        NOT NULL DEFAULT NOW()
                                   ON UPDATE NOW()             COMMENT 'Thời điểm cập nhật gần nhất',

    CONSTRAINT pk_trade          PRIMARY KEY (id),
    CONSTRAINT fk_trade_seller   FOREIGN KEY (sellerId)  REFERENCES User(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_trade_buyer    FOREIGN KEY (buyerId)   REFERENCES User(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_trade_status   CHECK (status IN ('DRAFT','LISTED','ARMED','FUNDED','COMPLETED','CANCELLED','EXPIRED')),
    CONSTRAINT ck_escrow_positive CHECK (escrowAmount > 0)
) ENGINE=InnoDB
  COMMENT='Giao dịch mua bán Safe multisig';

CREATE INDEX idx_trade_seller  ON Trade (sellerId);
CREATE INDEX idx_trade_buyer   ON Trade (buyerId);
CREATE INDEX idx_trade_status  ON Trade (status);

CREATE TABLE Evidence (
    id          CHAR(36)    NOT NULL                    COMMENT 'Khóa chính UUID',
    tradeId     INT         NOT NULL                    COMMENT 'FK → Trade',
    type        VARCHAR(30) NOT NULL                    COMMENT 'Loại: NONCE_DRIFT | OWNER_CHANGE | TX_UNEXPECTED',
    payload     JSON        NOT NULL                    COMMENT 'Chi tiết sự kiện: nonce cũ/mới, địa chỉ, tx hash...',
    detectedAt  DATETIME    NOT NULL DEFAULT NOW()      COMMENT 'Thời điểm SafeWatcher phát hiện',

    CONSTRAINT pk_evidence       PRIMARY KEY (id),
    CONSTRAINT fk_evidence_trade FOREIGN KEY (tradeId) REFERENCES Trade(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_evidence_type  CHECK (type IN ('NONCE_DRIFT', 'OWNER_CHANGE', 'TX_UNEXPECTED'))
) ENGINE=InnoDB
  COMMENT='Bằng chứng bất thường trong quá trình giám sát on-chain';

CREATE INDEX idx_evidence_trade ON Evidence (tradeId);

CREATE TABLE ChatSession (
    sessionId   CHAR(36)    NOT NULL                    COMMENT 'Khóa chính UUID',
    userId      CHAR(36)    NOT NULL                    COMMENT 'FK → User',
    startedAt   DATETIME    NOT NULL DEFAULT NOW()      COMMENT 'Thời điểm bắt đầu phiên',
    lastActive  DATETIME    NOT NULL DEFAULT NOW()
                            ON UPDATE NOW()             COMMENT 'Thời điểm hoạt động gần nhất',

    CONSTRAINT pk_session      PRIMARY KEY (sessionId),
    CONSTRAINT fk_session_user FOREIGN KEY (userId) REFERENCES User(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Phiên hội thoại giữa người dùng và AI agent';

CREATE INDEX idx_session_user ON ChatSession (userId);

CREATE TABLE Message (
    id          CHAR(36)    NOT NULL                    COMMENT 'Khóa chính UUID',
    sessionId   CHAR(36)    NOT NULL                    COMMENT 'FK → ChatSession',
    role        VARCHAR(20) NOT NULL                    COMMENT 'Vai trò: user | assistant',
    content     TEXT        NOT NULL                    COMMENT 'Nội dung tin nhắn',
    toolCalls   JSON            NULL                    COMMENT 'Tool calls do agent thực hiện (nếu có)',
    timestamp   DATETIME    NOT NULL DEFAULT NOW()      COMMENT 'Thời điểm gửi tin nhắn',

    CONSTRAINT pk_message         PRIMARY KEY (id),
    CONSTRAINT fk_message_session FOREIGN KEY (sessionId) REFERENCES ChatSession(sessionId) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_message_role    CHECK (role IN ('user', 'assistant'))
) ENGINE=InnoDB
  COMMENT='Tin nhắn trong phiên hội thoại';

CREATE INDEX idx_message_session   ON Message (sessionId);
CREATE INDEX idx_message_timestamp ON Message (sessionId, timestamp);


INSERT INTO User (id, walletAddress, role, createdAt) VALUES
    ('u-0001-0000-0000-000000000001', '0xSellerAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'SELLER', NOW()),
    ('u-0001-0000-0000-000000000002', '0xBuyerBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'BUYER',  NOW());

INSERT INTO Trade (sellerId, buyerId, safeAddress, escrowAmount, status, createdAt, updatedAt) VALUES
    ('u-0001-0000-0000-000000000001', NULL,
     '0xSafe1111111111111111111111111111111111', 1.5, 'LISTED', NOW(), NOW());