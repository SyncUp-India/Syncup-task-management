# Team Board — Task Management + GitHub PR Tracking

A free, self-hosted task board for teams of 10–30 with QA Excel import, GitHub PR auto-sync, overdue escalation, and member views. Built with Next.js + Supabase.

**Total hosting cost: ₹0 / month** (all free tiers).

---

## What's inside

- Kanban board (Todo / In Progress / In Review / Done)
- Excel upload — QA keeps using their sheet, tasks auto-appear on board
- Manual task creation — for non-tech members (PM, marketing, design)
- GitHub PR auto-linking — webhook updates task status on PR open/merge/close
- Overdue detection — daily cron, Slack notifications, escalation dashboard
- Time tracking — estimated vs spent hours
- Member filtering — see only your tasks, or filter by role
- Activity log — audit trail of who did what when

---

## Prerequisites (one-time)

Install these on your machine:

1. **Node.js 20+** — https://nodejs.org (download the LTS installer)
2. **Git** — https://git-scm.com
3. A **GitHub account** — https://github.com/signup
4. A **Supabase account** — https://supabase.com (free, use GitHub to sign in)
5. A **Vercel account** — https://vercel.com (free, use GitHub to sign in)

Verify install:
```bash
node --version   # should print v20.x or higher
git --version
```

---

## Part 1 — Set up the database (Supabase)

1. Go to https://supabase.com/dashboard → **New project**
2. Name: `team-board`, pick a region close to India (e.g. `ap-south-1 Mumbai`), set a strong DB password (save it somewhere safe)
3. Wait ~2 minutes for it to provision
4. Once ready, click **SQL Editor** in the left sidebar → **New query**
5. Copy the entire contents of `supabase/schema.sql` (in this project) and paste it in
6. Click **Run**. You should see "Success. No rows returned."
7. Click **Project Settings** (gear icon) → **API**. Copy these two values — you'll need them in Part 2:
   - `Project URL` (looks like `https://xxxxx.supabase.co`)
   - `anon public` key (long string starting with `eyJ...`)
   - `service_role` key (another long string — **keep this secret, it bypasses all security**)

---

## Part 2 — Run it locally

```bash
# 1. Unzip the project and open it
cd team-board

# 2. Install dependencies
npm install

# 3. Create your env file
cp .env.example .env.local

# 4. Open .env.local in any text editor and fill in the values from Supabase
```

Your `.env.local` should look like:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
GITHUB_WEBHOOK_SECRET=pick-any-random-string-here
SLACK_WEBHOOK_URL=   # optional, leave blank for now
CRON_SECRET=pick-another-random-string
```

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the board with sample data.

---

## Part 3 — Deploy to production (Vercel)

1. Push this project to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # On GitHub, create a new private repo called "team-board", then:
   git remote add origin https://github.com/YOUR-USERNAME/team-board.git
   git branch -M main
   git push -u origin main
   ```

2. Go to https://vercel.com/new → **Import** your `team-board` repo
3. In the import screen, expand **Environment Variables** and paste the same variables from your `.env.local` (copy each one)
4. Click **Deploy**. Wait ~2 minutes.
5. Vercel gives you a URL like `https://team-board-xyz.vercel.app` — this is your live app.

---

## Part 4 — Wire up GitHub PR integration

For every repo your team uses:

1. Go to the repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL:** `https://YOUR-VERCEL-URL.vercel.app/api/github-webhook`
3. **Content type:** `application/json`
4. **Secret:** paste the same `GITHUB_WEBHOOK_SECRET` from your env vars
5. **Which events:** select "Let me choose individual events" → check **Pull requests** only
6. Click **Add webhook**

Now when a dev opens a PR with `TASK-123` in the title or description, the task auto-links. When the PR merges, task auto-moves to Done.

---

## Part 5 — Wire up Slack notifications (optional but recommended)

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**
2. Name: `Team Board`, pick your workspace
3. Left sidebar → **Incoming Webhooks** → toggle **On**
4. Scroll down → **Add New Webhook to Workspace** → pick a channel (e.g. `#team-board-alerts`)
5. Copy the webhook URL (starts with `https://hooks.slack.com/...`)
6. In Vercel → your project → **Settings** → **Environment Variables** → edit `SLACK_WEBHOOK_URL` and paste it
7. **Redeploy**: Vercel → Deployments → click the latest one → three dots → **Redeploy**

---

## Part 6 — Set up the overdue cron job

Vercel Cron is free for 1 cron/day on hobby plan — perfect for us.

1. The file `vercel.json` in this project is already configured to run `/api/cron` daily at 9am IST.
2. After deploying, Vercel auto-detects this and enables the cron. Verify: Vercel dashboard → your project → **Cron Jobs** tab.

The cron sends Slack messages for overdue tasks and flags escalations.

---

## Excel upload format

QA's sheet should have these columns (first row is headers, case-insensitive):

| title | assignee | priority | due_date | status | est_hours | description |
|-------|----------|----------|----------|--------|-----------|-------------|
| Login bug on mobile | Arjun | high | 2026-05-01 | todo | 4 | Steps to reproduce... |

- `priority` must be: `high`, `medium`, or `low`
- `status` must be: `todo`, `inprogress`, `review`, or `done`
- `due_date` format: `YYYY-MM-DD`
- `assignee` must match a team member's name exactly (add members first via the Members page)

Upload via the **Import from Excel** button on the board.

---

## Productivity tips baked in

- **WIP limit warning** — cards pulse red if a member has >3 in-progress tasks
- **Auto-escalation** — 1 day overdue = Slack ping, 3 days = manager tagged, 7 days = flagged on PM dashboard
- **GitHub PR turnaround tracking** — shows avg time from PR open to merge per dev
- **Weekly digest** — every Monday 9am, Slack gets a team velocity summary

---

## Troubleshooting

**`npm install` fails** — Make sure you have Node 20+. Run `node --version`. If older, uninstall and reinstall from nodejs.org.

**"Invalid API key" on localhost** — Double-check `.env.local` has no quotes around values and no spaces. Restart `npm run dev` after editing.

**Vercel build fails** — Check the build logs in Vercel. Usually it's a missing env var. Add it in Settings → Environment Variables and redeploy.

**GitHub webhook not working** — In the repo's webhook settings, scroll to **Recent Deliveries**. Click a failed one to see the error. Usually it's a mismatched secret.

---

## What to do next

1. Add your team members via the Members page
2. Have QA export their current Excel sheet in the column format above, then upload
3. Install the GitHub webhook on your main repos
4. Invite the team and start using it

Questions? Re-open this with Claude and paste any error message.
