import nodemailer from 'nodemailer'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[email] SMTP not configured – skipping email to ${to}: ${subject}`)
    return
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  await transport.sendMail({
    from: `"SyncUp" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  })
}

export function overdueTaskHtml(opts: {
  task: { id: number; title: string; description?: string; due_date: string; priority: string; status: string }
  assigneeName: string
  daysOverdue: number
}): string {
  const { task, assigneeName, daysOverdue } = opts
  const urgencyColor = daysOverdue >= 7 ? '#f43f5e' : daysOverdue >= 3 ? '#f59e0b' : '#3b82f6'
  const urgencyLabel = daysOverdue >= 7 ? '🔴 CRITICAL' : daysOverdue >= 3 ? '🔶 HIGH' : '⚠️ OVERDUE'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Task Overdue – SyncUp</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Inter,-apple-system,BlinkMacSystemFont,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Card -->
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,0.10);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#3b82f6 0%,#0ea5e9 100%);padding:28px 32px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="52">
            <div style="width:42px;height:42px;background:rgba(255,255,255,0.18);border-radius:12px;text-align:center;line-height:42px;">
              <span style="font-size:20px;font-weight:800;color:#fff;">S</span>
            </div>
          </td>
          <td>
            <p style="margin:0;font-size:19px;font-weight:700;color:#fff;letter-spacing:-0.2px;">SyncUp</p>
            <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.78);">Task Alert — Action Required</p>
          </td>
        </tr></table>
      </div>

      <!-- Body -->
      <div style="padding:32px 32px 24px;">

        <!-- Urgency badge -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:26px;">
          <tr>
            <td style="background:${urgencyColor}18;border:1px solid ${urgencyColor}45;border-radius:8px;padding:11px 16px;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="18">
                  <div style="width:8px;height:8px;border-radius:50%;background:${urgencyColor};margin-top:2px;"></div>
                </td>
                <td>
                  <span style="font-size:13px;font-weight:600;color:${urgencyColor};">${urgencyLabel} &nbsp;·&nbsp; ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</span>
                </td>
              </tr></table>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 5px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Task</p>
        <h2 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#1e293b;line-height:1.35;">${task.title}</h2>
        ${task.description ? `<p style="margin:0 0 26px;font-size:14px;color:#64748b;line-height:1.65;">${task.description}</p>` : '<div style="margin-bottom:26px;"></div>'}

        <!-- Details table -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;border:1px solid #e9eef6;border-radius:10px;overflow:hidden;">
          <tr style="background:#f8fafc;">
            <td style="padding:11px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;width:130px;border-bottom:1px solid #e9eef6;">Assignee</td>
            <td style="padding:11px 16px;font-size:13px;color:#1e293b;font-weight:500;border-bottom:1px solid #e9eef6;">${assigneeName}</td>
          </tr>
          <tr>
            <td style="padding:11px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #e9eef6;">Due Date</td>
            <td style="padding:11px 16px;font-size:13px;color:#f43f5e;font-weight:600;border-bottom:1px solid #e9eef6;">${task.due_date}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:11px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #e9eef6;">Priority</td>
            <td style="padding:11px 16px;font-size:13px;color:#1e293b;font-weight:500;border-bottom:1px solid #e9eef6;text-transform:capitalize;">${task.priority}</td>
          </tr>
          <tr>
            <td style="padding:11px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Status</td>
            <td style="padding:11px 16px;font-size:13px;color:#1e293b;font-weight:500;text-transform:capitalize;">${task.status}</td>
          </tr>
        </table>

        <!-- Notice box -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;font-size:13px;color:#64748b;line-height:1.7;">
              Hi <strong style="color:#1e293b;">${assigneeName}</strong>, this task was due on
              <strong style="color:#f43f5e;">${task.due_date}</strong> and is now
              <strong style="color:#1e293b;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</strong>.
              Please update the task status or reach out to your team lead as soon as possible.
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <a href="${appUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#0ea5e9);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:9px;font-size:14px;font-weight:600;letter-spacing:0.01em;box-shadow:0 4px 18px rgba(59,130,246,0.35);">
                Open Task Board →
              </a>
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e9eef6;padding:18px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
          Automated notification from <strong style="color:#3b82f6;">SyncUp</strong>
          &nbsp;·&nbsp; Task #${task.id}
          &nbsp;·&nbsp; Do not reply to this email
        </p>
      </div>

    </div>
  </div>
</body>
</html>`
}
