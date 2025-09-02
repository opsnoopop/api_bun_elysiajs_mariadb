USE testdb;

ALTER DATABASE testdb CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS testdb.users (
  user_id INT NOT NULL AUTO_INCREMENT ,
  username VARCHAR(50) NOT NULL ,
  email VARCHAR(100) NOT NULL ,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  PRIMARY KEY (user_id)
) ENGINE = InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO testdb.users (username, email) VALUES ('optest', 'opsnoopop@hotmail.com');