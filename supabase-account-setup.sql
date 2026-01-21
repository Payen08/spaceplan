-- 账号系统数据库设置脚本
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 删除旧的projects表（如果存在）
DROP TABLE IF EXISTS projects CASCADE;

-- 2. 创建账号表
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,                -- 账号ID，如 "payen"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建项目表（关联到账号）
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                -- 项目UUID
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dimensions JSONB NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_account_id ON projects(account_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at DESC);

-- 5. 启用 Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 6. 账号表策略 - 允许所有人读写
DROP POLICY IF EXISTS "Allow public read on accounts" ON accounts;
CREATE POLICY "Allow public read on accounts" 
ON accounts FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on accounts" ON accounts;
CREATE POLICY "Allow public insert on accounts" 
ON accounts FOR INSERT 
TO public 
WITH CHECK (true);

-- 7. 项目表策略 - 允许所有人读写
DROP POLICY IF EXISTS "Allow public read on projects" ON projects;
CREATE POLICY "Allow public read on projects" 
ON projects FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on projects" ON projects;
CREATE POLICY "Allow public insert on projects" 
ON projects FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on projects" ON projects;
CREATE POLICY "Allow public update on projects" 
ON projects FOR UPDATE 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public delete on projects" ON projects;
CREATE POLICY "Allow public delete on projects" 
ON projects FOR DELETE 
TO public 
USING (true);

-- 8. 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 完成！现在可以使用账号系统了
-- 使用方式：
-- 1. 输入账号ID（如 "payen"）
-- 2. 系统自动创建账号（如果不存在）
-- 3. 所有项目都关联到这个账号
-- 4. 切换设备时输入相同账号ID即可同步所有项目
