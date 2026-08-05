# 🚀 QUICK START GUIDE - Supabase Integration

## 📋 TL;DR - 3 Steps

### Step 1: Create Database (5 min)
```
1. Go to: https://app.supabase.com
2. Select project: vvbyobyqqcflvcbbmtqd
3. Go to: SQL Editor → New Query
4. Copy all code from: supabase_schema.sql
5. Paste & click Run ✅
```

### Step 2: Update Code (5 min)
```bash
# Backup current files
cp src/app/auth/login/page.tsx src/app/auth/login/page_backup.tsx
cp src/app/auth/signup/page.tsx src/app/auth/signup/page_backup.tsx

# Use Supabase versions
mv src/app/auth/login/page_supabase.tsx src/app/auth/login/page.tsx
mv src/app/auth/signup/page_supabase.tsx src/app/auth/signup/page.tsx
```

### Step 3: Test (5 min)
```
1. npm run dev
2. Go to: http://localhost:9002/auth/signup
3. Create account & verify in Supabase
✅ Done!
```

---

## 📂 Files Created

| File | Purpose |
|------|---------|
| `src/lib/supabase-client.ts` | All Supabase operations |
| `src/app/auth/login/page_supabase.tsx` | Login with tracking |
| `src/app/auth/signup/page_supabase.tsx` | Signup with Supabase |
| `src/components/admin-dashboard.tsx` | View all users |
| `supabase_schema.sql` | Database tables |
| `SUPABASE_SETUP.md` | Detailed setup |
| `INTEGRATION_CHECKLIST.md` | Full checklist |

---

## ✅ What Gets Stored in Supabase

```
✅ User Login Details
   - Name, Email, Password Hash
   - Account Creation Date
   - Last Login Time
   - Total Login Count

✅ User Performance
   - Average Exam Score
   - Total Exams Taken
   - Weak Topics (detected)
   - Strong Topics (detected)

✅ User History
   - Each Login (with timestamp & browser info)
   - Each Exam (score, topic, time, feedback)
   - Answer History
```

---

## 🔍 Check Your Data

### In Supabase Console
```sql
-- Count users
SELECT COUNT(*) FROM users;

-- See all users
SELECT name, email, average_score, total_exams, login_count FROM users;

-- See login history
SELECT * FROM login_history ORDER BY login_time DESC LIMIT 10;

-- See exam results
SELECT * FROM exam_results ORDER BY created_at DESC LIMIT 10;

-- See user analytics
SELECT * FROM user_performance_summary;
```

---

## 💻 In Your Code

```typescript
// Import the functions
import { 
  recordLogin,      // Record user login
  saveExamResult,   // Save exam score
  getUserAnalytics, // Get user stats
  getAllUsersAnalytics // Get all users (admin)
} from '@/lib/supabase-client'

// Record login after user authenticates
await recordLogin(userId)

// Save exam after completion
await saveExamResult(userId, {
  exam_id: 'exam_123',
  topic: 'Banking',
  difficulty: 'hard',
  total_marks: 100,
  obtained_marks: 85,
  questions: [...],
  answers: {...},
  time_taken: 3600
})

// Get user performance
const analytics = await getUserAnalytics(userId)
// Returns: user profile, average score, weak topics, login count, etc.
```

---

## 🎯 What You Can Now Track

| Metric | Where to Check |
|--------|----------------|
| **Total Users** | Supabase: `SELECT COUNT(*) FROM users;` |
| **User Login History** | Supabase: `SELECT * FROM login_history WHERE user_id = '...'` |
| **User Performance** | Supabase: `SELECT * FROM user_performance_summary` |
| **Exam History** | Supabase: `SELECT * FROM exam_results WHERE user_id = '...'` |
| **Weak Topics** | Supabase: `SELECT topic, avg_score FROM topic_performance` |
| **Login Trends** | Supabase: `SELECT * FROM daily_login_trends` |

---

## 🛡️ Security

**Current (Development)**:
- Passwords stored as plain text
- Good for testing

**For Production** (add this):
```bash
npm install bcryptjs
```

Then hash passwords:
```typescript
import bcrypt from 'bcryptjs'

// On signup/password change
const hashedPassword = await bcrypt.hash(password, 10)

// On login
const isValid = await bcrypt.compare(password, storedHash)
```

---

## 🔧 Troubleshooting

### Tables not created?
→ Run `supabase_schema.sql` again

### Can't login?
→ Check `.env.local` has credentials

### "Query failed"?
→ Copy the entire `supabase_schema.sql` file again

### RLS Policy Error?
→ Go to Supabase → Authentication → Policies → Disable RLS temporarily

---

## 📊 Admin Dashboard

Create `src/app/admin/page.tsx`:
```typescript
import AdminDashboard from '@/components/admin-dashboard'

export default function AdminPage() {
  return <AdminDashboard />
}
```

Then visit: `http://localhost:9002/admin`

See:
- Total users
- Total exams
- User table with scores & logins
- Export to CSV

---

## 🎓 Example: Track Student Performance

```typescript
// After user takes exam
const examResult = await saveExamResult(userId, {
  exam_id: 'banking_001',
  topic: 'Banking Knowledge',
  difficulty: 'hard',
  total_marks: 100,
  obtained_marks: 78,
  questions: examQuestions,
  answers: userAnswers,
  time_taken: 2400 // seconds
})

// Get student's updated performance
const analytics = await getUserAnalytics(userId)

console.log({
  averageScore: analytics.averageScore,      // 78.5%
  totalExams: analytics.totalExams,          // 5
  weakTopics: analytics.weakTopics,          // ['English', 'Reasoning']
  strongTopics: analytics.strongTopics,      // ['Quantitative']
  lastLogin: analytics.lastLogin,            // 2026-05-10T12:30:00Z
  loginCount: analytics.loginCount           // 12
})
```

---

## 📱 Query Examples

### Get top 10 students
```sql
SELECT name, email, average_score 
FROM user_performance_summary 
ORDER BY average_score DESC 
LIMIT 10;
```

### Get students who haven't logged in 7 days
```sql
SELECT name, email, last_login 
FROM users 
WHERE last_login < NOW() - INTERVAL '7 days' 
  OR last_login IS NULL;
```

### Get most active students
```sql
SELECT name, login_count, total_exams 
FROM user_performance_summary 
ORDER BY login_count DESC 
LIMIT 10;
```

### Topic-wise performance
```sql
SELECT topic, COUNT(*) as attempts, AVG(avg_score) as avg_topic_score 
FROM topic_performance 
GROUP BY topic 
ORDER BY avg_topic_score DESC;
```

---

## 🚀 Next Steps

1. Run `supabase_schema.sql` ✅
2. Update auth pages ✅
3. Test signup/login ✅
4. Verify data in Supabase ✅
5. Create admin dashboard ✅
6. Update exam saving ✅
7. Monitor user analytics ✅

**You're ready to go!** 🎉

Questions? Check `SUPABASE_SETUP.md` or `INTEGRATION_CHECKLIST.md`
