import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // Get all members for name-to-id lookup
    const { data: members } = await supabaseAdmin.from('members').select('id, name');
    const memberMap: any = {};
    (members || []).forEach(m => { memberMap[m.name.toLowerCase().trim()] = m.id; });

    const tasks: any[] = [];
    const errors: string[] = [];

    rows.forEach((row, idx) => {
      const getField = (name: string) => {
        const key = Object.keys(row).find(k => k.toLowerCase().trim() === name.toLowerCase());
        return key ? row[key] : null;
      };

      const title = getField('title');
      if (!title) {
        errors.push(`Row ${idx + 2}: missing title — skipped`);
        return;
      }
      const assigneeName = (getField('assignee') || '').toString().toLowerCase().trim();
      const assignee_id = memberMap[assigneeName] || null;
      if (assigneeName && !assignee_id) {
        errors.push(`Row ${idx + 2}: assignee "${getField('assignee')}" not found — task created unassigned`);
      }

      const priority = ((getField('priority') || 'medium').toString().toLowerCase().trim());
      const validPriorities = ['high', 'medium', 'low'];
      const status = ((getField('status') || 'todo').toString().toLowerCase().trim());
      const validStatuses = ['todo', 'inprogress', 'review', 'done'];

      let dueDate = getField('due_date') || getField('due date') || null;
      if (dueDate instanceof Date) dueDate = dueDate.toISOString().slice(0, 10);
      else if (dueDate) dueDate = String(dueDate).slice(0, 10);

      tasks.push({
        title: String(title),
        description: getField('description') || null,
        assignee_id,
        priority: validPriorities.includes(priority) ? priority : 'medium',
        status: validStatuses.includes(status) ? status : 'todo',
        due_date: dueDate,
        est_hours: parseFloat(getField('est_hours') || getField('est hours')) || 0,
        source: 'excel',
      });
    });

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'No valid tasks found', errors }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('tasks').insert(tasks).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ imported: data.length, warnings: errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
