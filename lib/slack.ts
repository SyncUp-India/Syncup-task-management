export async function sendSlack(message: string) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return; // Slack not configured — skip silently
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (e) {
    console.error('Slack notify failed:', e);
  }
}
