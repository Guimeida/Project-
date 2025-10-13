-- users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- resources table
CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT,
  url TEXT,
  description TEXT,
  progress_status TEXT DEFAULT 'Not Started',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Pre-populate tags
INSERT INTO tags (name) VALUES
('JavaScript'),
('Python'),
('Java'),
('C++'),
('HTML'),
('CSS'),
('React'),
('Node.js'),
('Express'),
('SQL'),
('PostgreSQL'),
('Web Development'),
('Frontend'),
('Backend'),
('Fullstack'),
('Machine Learning'),
('Data Science'),
('APIs'),
('Testing'),
('DevOps'),
('Git'),
('Software Engineering'),
('Algorithms'),
('Design Patterns'),
('UI Design'),
('UX Design'),
('Cloud Computing'),
('Docker'),
('Kubernetes'),
('Self-Learning')
ON CONFLICT (name) DO NOTHING;

-- resource_tags table (many-to-many between resources and tags)
CREATE TABLE IF NOT EXISTS resource_tags (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE
);

-- notes table
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  content TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);