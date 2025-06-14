ALTER SYSTEM SET max_wal_size = '4GB';
SELECT pg_reload_conf();

-- 建立資料庫
CREATE DATABASE user_test;

CREATE DATABASE group_test;

CREATE DATABASE combine_test;

-- Connect to user_test database
\c user_test

-- Enable FDW extension
CREATE EXTENSION IF NOT EXISTS "postgres_fdw";

-- Enable the extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user table
CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100)
);

-- Create user dummy data
COPY "user"(id, account, email, display_name)
FROM '/docker-entrypoint-initdb.d/data/user.csv' WITH (FORMAT csv, HEADER false);

-- Connect to group_test database
\c group_test

-- Enable FDW extension
CREATE EXTENSION IF NOT EXISTS "postgres_fdw";

-- Enable the extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create group table
CREATE TABLE "group" (
  id UUID PRIMARY KEY,
  name VARCHAR(255)
);

-- Create group_user table
CREATE TABLE "group_user" (
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Create group dummy data
COPY "group"(id, name)
FROM '/docker-entrypoint-initdb.d/data/group.csv' WITH (FORMAT csv, HEADER false);

COPY "group_user"(group_id, user_id)
FROM '/docker-entrypoint-initdb.d/data/group_user.csv' WITH (FORMAT csv, HEADER false);

-- Add the foreign key constraint separately
ALTER TABLE public.group_user
ADD CONSTRAINT fk_group_user
FOREIGN KEY (group_id) REFERENCES public.group(id) ON DELETE CASCADE;

-- Connect to group_test database
\c combine_test

-- Enable FDW extension
CREATE EXTENSION IF NOT EXISTS "postgres_fdw";

-- Enable the extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 建立 user_test foreign server
CREATE SERVER IF NOT EXISTS user_test_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'localhost', dbname 'user_test', port '5432');

-- 建立 group_test foreign server
CREATE SERVER IF NOT EXISTS group_test_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'localhost', dbname 'group_test', port '5432');

-- 建立 user mapping
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
  SERVER user_test_server
  OPTIONS (user 'admin', password 'admin');

CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
  SERVER group_test_server
  OPTIONS (user 'admin', password 'admin');
