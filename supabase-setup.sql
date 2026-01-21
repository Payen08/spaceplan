-- Supabase 数据库设置脚本
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 创建 projects 表
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dimensions JSONB NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 3. 启用 Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略 - 允许所有人读写（简化版本）
-- 注意：生产环境应该添加用户认证和所有权检查

-- 允许所有人读取
DROP POLICY IF EXISTS "Allow public read access" ON projects;
CREATE POLICY "Allow public read access" 
ON projects FOR SELECT 
TO public 
USING (true);

-- 允许所有人插入
DROP POLICY IF EXISTS "Allow public insert" ON projects;
CREATE POLICY "Allow public insert" 
ON projects FOR INSERT 
TO public 
WITH CHECK (true);

-- 允许所有人更新
DROP POLICY IF EXISTS "Allow public update" ON projects;
CREATE POLICY "Allow public update" 
ON projects FOR UPDATE 
TO public 
USING (true);

-- 5. 创建自动更新 updated_at 的触发器
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

-- 完成！现在可以开始使用云同步功能了
