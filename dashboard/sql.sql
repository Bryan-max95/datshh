CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cameras (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45) NOT NULL,
  name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  ports INTEGER[],
  vulnerabilities JSONB,
  last_scanned TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  os VARCHAR(100),
  ports INTEGER[],
  last_scanned TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  group VARCHAR(100),
  status VARCHAR(50),
  cpu_usage FLOAT,
  memory_usage FLOAT,
  browsers JSONB,
  software JSONB,
  cves JSONB,
  geo JSONB
);

CREATE TABLE policies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE compliance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  standard VARCHAR(100) NOT NULL,
  status VARCHAR(50),
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE threats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45),
  type VARCHAR(100),
  severity VARCHAR(50),
  detected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vulnerabilities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  cve_id VARCHAR(50) NOT NULL,
  severity VARCHAR(50),
  description TEXT,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);