-- Supabase SQL Schema for Mock Exam Platform
-- Copy and paste this entire script into Supabase SQL Editor

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    average_score FLOAT DEFAULT 0,
    total_exams INTEGER DEFAULT 0,
    weak_topics TEXT[] DEFAULT ARRAY['English', 'Quantitative Aptitude', 'Logical Reasoning'],
    strong_topics TEXT[] DEFAULT ARRAY['English Language'],
    difficulty_preference VARCHAR(10) DEFAULT 'medium',
    target_exam VARCHAR(255),
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for email lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 2. LOGIN HISTORY TABLE
CREATE TABLE login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for login history
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_login_time ON login_history(login_time DESC);

-- 3. EXAM RESULTS TABLE
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    difficulty VARCHAR(10) NOT NULL,
    total_marks INTEGER NOT NULL,
    obtained_marks INTEGER NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    feedback TEXT,
    time_taken INTEGER,
    category VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for exam results
CREATE INDEX idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX idx_exam_results_topic ON exam_results(topic);
CREATE INDEX idx_exam_results_created_at ON exam_results(created_at DESC);
CREATE INDEX idx_exam_results_difficulty ON exam_results(difficulty);

-- 4. USEFUL VIEWS FOR ANALYTICS

-- View: User Performance Summary
CREATE VIEW user_performance_summary AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(er.id) as total_exams,
    AVG(CAST(er.obtained_marks AS FLOAT) / CAST(er.total_marks AS FLOAT) * 100) as avg_percentage,
    MAX(CAST(er.obtained_marks AS FLOAT) / CAST(er.total_marks AS FLOAT) * 100) as best_score,
    MIN(CAST(er.obtained_marks AS FLOAT) / CAST(er.total_marks AS FLOAT) * 100) as worst_score,
    AVG(er.time_taken) as avg_time_seconds,
    u.last_login,
    u.login_count,
    u.created_at
FROM users u
LEFT JOIN exam_results er ON u.id = er.user_id
GROUP BY u.id, u.name, u.email, u.last_login, u.login_count, u.created_at;

-- View: Topic Performance
CREATE VIEW topic_performance AS
SELECT 
    u.id,
    u.name,
    er.topic,
    COUNT(er.id) as attempts,
    AVG(CAST(er.obtained_marks AS FLOAT) / CAST(er.total_marks AS FLOAT) * 100) as avg_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CAST(er.obtained_marks AS FLOAT) / CAST(er.total_marks AS FLOAT) * 100) as median_score
FROM users u
LEFT JOIN exam_results er ON u.id = er.user_id
GROUP BY u.id, u.name, er.topic;

-- View: Daily Login Trends
CREATE VIEW daily_login_trends AS
SELECT 
    DATE(login_time) as login_date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_logins
FROM login_history
GROUP BY DATE(login_time)
ORDER BY login_date DESC;

-- 5. ENABLE ROW LEVEL SECURITY (RLS) - SECURITY BEST PRACTICE

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Policy: Users can update their own profile
CREATE POLICY users_update_own ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy: Users can view their own login history
CREATE POLICY login_history_select_own ON login_history
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy: Users can view their own exam results
CREATE POLICY exam_results_select_own ON exam_results
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy: Users can insert their own exam results
CREATE POLICY exam_results_insert_own ON exam_results
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 6. TRIGGER: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. SAMPLE QUERIES FOR TESTING

-- Get all users with their stats
-- SELECT * FROM user_performance_summary ORDER BY total_exams DESC;

-- Get user analytics by ID
-- SELECT * FROM user_performance_summary WHERE id = 'USER_ID_HERE';

-- Get login trends
-- SELECT * FROM daily_login_trends;

-- Get user's exam history
-- SELECT exam_id, topic, difficulty, obtained_marks, total_marks, time_taken, created_at 
-- FROM exam_results 
-- WHERE user_id = 'USER_ID_HERE' 
-- ORDER BY created_at DESC;

-- Get weak topics for a user
-- SELECT user_id, topic, avg_score FROM topic_performance WHERE user_id = 'USER_ID_HERE' ORDER BY avg_score ASC;
