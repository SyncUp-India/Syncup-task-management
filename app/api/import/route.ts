import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { getSessionFromRequest } from '@/lib/auth'

function normalizeKey(k: string) {
  return k.toLowerCase().trim().replace(/[\s/]+/g, ' ')
}

function getField(row: any, ...names: string[]) {
  for (const name of names) {
    const key = Object.keys(row).find(k => normalizeKey(k) === name.toLowerCase())
    if (key && row[key] !== null && row[key] !== '') return row[key]
  }
  return null
}

function mapPriority(raw: string): 'high' | 'medium' | 'low' {
  const s = (raw || '').toLowerCase()
  if (s.includes('critical') || s.includes('high')) return 'high'
  if (s.includes('low')) return 'low'
  return 'medium'
}

function mapStatus(rawStatus: string, rawPassFail: string): string {
  const s = (rawStatus || '').toLowerCase()
  const pf = (rawPassFail || '').toLowerCase()
  if (s === 'done' || pf === 'pass') return 'done'
  if (s === 'inprogress' || s === 'in progress' || s === 'wip') return 'inprogress'
  if (s === 'review' || s === 'in review') return 'review'
  if (s === 'blocked') return 'blocked'
  if (pf === 'fail') return 'todo'
  return 'todo'
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const department = (formData.get('department') as string) || null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // Get members for name-to-id lookup
    const { data: members } = await supabaseAdmin.from('users').select('id, name').eq('active', true)
    const memberMap: Record<string, string> = {}
    for (const m of members || []) memberMap[m.name.toLowerCase().trim()] = m.id

    const tasks: any[] = []
    const errors: string[] = []

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null })
      const tag = sheetName.trim()

      rows.forEach((row, idx) => {
        const g = (...names: string[]) => getField(row, ...names)

        const title = g('title')
        if (!title) {
          if (Object.values(row).some(v => v !== null)) {
            errors.push(`Sheet "${tag}" Row ${idx + 2}: missing title — skipped`)
          }
          return
        }

        // Assignee
        const assigneeName = String(g('assignee', 'assigned to', 'assign to') || '').toLowerCase().trim()
        const assignee_id = memberMap[assigneeName] || null
        if (assigneeName && !assignee_id) {
          errors.push(`Sheet "${tag}" Row ${idx + 2}: assignee "${assigneeName}" not found — created unassigned`)
        }

        // Priority
        const priority = mapPriority(String(g('priority', 'severity priority', 'severity/priority', 'severity') || 'medium'))

        // Status
        const rawStatus   = String(g('status') || '')
        const rawPassFail = String(g('pass fail', 'pass/fail') || '')
        const status = mapStatus(rawStatus, rawPassFail)

        // Pass/Fail field
        let passFail: string | null = null
        if (rawPassFail.toLowerCase() === 'pass') passFail = 'pass'
        else if (rawPassFail.toLowerCase() === 'fail') passFail = 'fail'
        else if (rawPassFail) passFail = 'pending'

        // Due date
        let dueDate = g('due_date', 'due date') || null
        if (dueDate instanceof Date) dueDate = dueDate.toISOString().slice(0, 10)
        else if (dueDate) dueDate = String(dueDate).slice(0, 10)

        // Numeric fields
        const estHours = parseFloat(String(g('expected time', 'est_hours', 'est hours') || '0')) || 0

        // Test-case specific fields
        const testId     = g('test id', 'test_id') ? String(g('test id', 'test_id')) : null
        const steps      = g('steps to reproduce', 'steps') ? String(g('steps to reproduce', 'steps')) : null
        const expected   = g('expected result') ? String(g('expected result')) : null
        const actual     = g('actual result') ? String(g('actual result')) : null
        const desc       = g('description') ? String(g('description')) : null

        // Attachment
        const attachmentRaw = g('attachment', 'attachments')
        const attachments = attachmentRaw
          ? [{ name: 'Attachment', url: String(attachmentRaw), type: 'link' }]
          : []

        tasks.push({
          title:              String(title).trim(),
          description:        desc,
          assignee_id,
          priority,
          status,
          due_date:           dueDate || null,
          est_hours:          estHours,
          source:             'excel',
          department:         department || null,
          tag:                wb.SheetNames.length > 1 ? tag : null,
          test_id:            testId,
          steps_to_reproduce: steps,
          expected_result:    expected,
          actual_result:      actual,
          pass_fail:          passFail,
          attachments:        attachments.length > 0 ? attachments : [],
        })
      })
    }

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'No valid tasks found', errors }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('tasks').insert(tasks).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      imported: data.length,
      sheets:   wb.SheetNames.length,
      warnings: errors,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
