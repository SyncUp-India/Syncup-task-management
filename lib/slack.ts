const DEPT_WEBHOOKS: Record<string, string | undefined> = {
  developer:   process.env.SLACK_WEBHOOK_URL,
  sales:       process.env.SYNCUP_TALENT_URL,
  marketing:   process.env.SYNCUP_MARKETING_URL,
  design_team: process.env.SYNCUP_DESIGN_URL,
}

async function post(webhook: string | undefined, text: string) {
  if (!webhook) return
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (e) {
    console.error('Slack notify failed:', e)
  }
}

/** Send to the developer/default channel */
export async function sendSlack(message: string) {
  await post(process.env.SLACK_WEBHOOK_URL, message)
}

/** Send to the correct department task channel, falls back to developer channel */
export async function sendSlackToDept(dept: string | null | undefined, message: string) {
  const hook = dept ? DEPT_WEBHOOKS[dept] : undefined
  await post(hook ?? process.env.SLACK_WEBHOOK_URL, message)
}

/** Send to the attendance channel (check-in/out, leaves, daily report) */
export async function sendAttendanceSlack(message: string) {
  await post(process.env.SYNCUP_ATTENDANCE_URL ?? process.env.SLACK_WEBHOOK_URL, message)
}
