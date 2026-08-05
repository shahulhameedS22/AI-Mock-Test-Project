# Supabase Integration Setup Guide

## Step 1: Copy SQL Schema to Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **vvbyobyqqcflvcbbmtqd**
3. Go to **SQL Editor** → Click **New Query**
4. Open file: `supabase_schema.sql`
5. Copy ALL the SQL code
6. Paste into Supabase SQL Editor
7. Click **Run** to create tables

✅ This creates:
- `users` table - stores user profiles, login count, weak/strong topics
- `login_history` table - tracks every login with timestamp
- `exam_results` table - stores exam performance
- Views for analytics

---

## Step 2: Enable Authentication (Optional but Recommended)

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Go to **Policies** and enable Row Level Security (RLS)

---

## Step 3: Verify .env.local

Check that your `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vvbyobyqqcflvcbbmtqd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GOOGLE_API_KEY=AIzaSyDdrw6uNOiIaUyYjAG18TszJiO-0iJPGXs
```

---

## Step 4: Update Store to Use Supabase

Replace your current `src/lib/store.ts` with the new Supabase-integrated version.

---

## Step 5: Test the Setup

### Test 1: Check Users Table
```sql
SELECT * FROM users;
```

### Test 2: Check Login History
```sql
SELECT * FROM login_history ORDER BY login_time DESC LIMIT 10;
```

### Test 3: Check Exam Results
```sql
SELECT * FROM exam_results ORDER BY created_at DESC LIMIT 10;
```

### Test 4: Get User Analytics
```sql
SELECT * FROM user_performance_summary;
```

---

## Common Queries You Can Use

### Count Total Users
```sql
SELECT COUNT(*) as total_users FROM users;
```

### Get User by Email
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

### Get User Login History
```sql
SELECT login_time, user_agent FROM login_history 
WHERE user_id = 'USER_UUID_HERE' 
ORDER BY login_time DESC 
LIMIT 20;
```

### Get User Performance
```sql
SELECT * FROM user_performance_summary 
WHERE id = 'USER_UUID_HERE';
```

### Get User's Exam History
```sql
SELECT exam_id, topic, difficulty, obtained_marks, total_marks, 
       (obtained_marks * 100.0 / total_marks) as percentage,
       time_taken, created_at
FROM exam_results 
WHERE user_id = 'USER_UUID_HERE' 
ORDER BY created_at DESC;
```

### Get User's Weak Topics
```sql
SELECT topic, avg_score FROM topic_performance 
WHERE id = 'USER_UUID_HERE' 
ORDER BY avg_score ASC 
LIMIT 5;
```

### Get Daily Login Stats
```sql
SELECT * FROM daily_login_trends 
ORDER BY login_date DESC 
LIMIT 30;
```

---

## Features Enabled by This Setup

✅ **User Profiles** - Name, email, weak/strong topics, performance scores  
✅ **Login Tracking** - Every login recorded with timestamp and user agent  
✅ **Exam History** - All exams with scores, topics, time taken, feedback  
✅ **Performance Analytics** - Average scores, best/worst performance by topic  
✅ **User Engagement** - Total logins, last login time  
✅ **Admin Dashboard** - View all users, their stats, and trends  

---

## Data Storage Locations

| Data | Location |
|------|----------|
| User Profile | `users` table |
| Login History | `login_history` table |
| Exam Results | `exam_results` table |
| Performance Stats | `user_performance_summary` view |
| Topic Analysis | `topic_performance` view |
| Login Trends | `daily_login_trends` view |

---

## API Usage Examples

Once you set up the schema, you can use these functions in your code:

```typescript
import { 
  getUserByEmail, 
  createUser, 
  recordLogin,
  saveExamResult,
  getUserExamResults,
  getUserAnalytics,
  getAllUsersAnalytics 
} from '@/lib/supabase-client'

// Register new user
const user = await createUser('John Doe', 'john@example.com', passwordHash)

// Record login
await recordLogin(user.id)

// Save exam result
await saveExamResult(user.id, {
  exam_id: 'exam_123',
  topic: 'Banking',
  difficulty: 'hard',
  total_marks: 100,
  obtained_marks: 85,
  questions: [...],
  answers: {...},
  time_taken: 3600
})

// Get user analytics
const analytics = await getUserAnalytics(user.id)
console.log(analytics)
// {
//   user: {...},
//   totalExams: 5,
//   averageScore: 78.5,
//   weakTopics: ['English', 'Reasoning'],
//   strongTopics: ['Quant'],
//   recentExams: [...],
//   loginHistory: [...],
//   lastLogin: '2026-05-10T...',
//   loginCount: 12
// }

// Get all users (for admin)
const allUsers = await getAllUsersAnalytics()
```

---

## Troubleshooting

### Issue: "NEXT_PUBLIC_SUPABASE_URL is not set"
**Fix**: Check your `.env.local` file and restart your dev server

### Issue: "Unable to connect to Supabase"
**Fix**: Check your internet connection and Supabase URL is correct

### Issue: "Row Level Security (RLS) policy error"
**Fix**: Go to Supabase Dashboard → Authentication → Policies → Disable RLS temporarily (or fix policies)

### Issue: Tables not appearing
**Fix**: Run the `supabase_schema.sql` script again in SQL Editor

---

## Next Steps

1. ✅ Copy & run `supabase_schema.sql`
2. ✅ Update `src/lib/store.ts` to use new Supabase client
3. ✅ Update login/signup pages to call `recordLogin()`
4. ✅ Update exam save to call `saveExamResult()`
5. ✅ Create admin dashboard to view analytics
6. ✅ Test everything!

