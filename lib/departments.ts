export const TASK_DEPARTMENTS = ['sales', 'marketing', 'developer'] as const
export const USER_DEPARTMENTS = ['admin', 'sales', 'marketing', 'developer'] as const

export type TaskDepartment = typeof TASK_DEPARTMENTS[number]
export type UserDepartment = typeof USER_DEPARTMENTS[number]

export const DEPT_META: Record<string, { label: string; bg: string; color: string }> = {
  admin:     { label: 'Admin',     bg: 'rgba(124,92,252,0.12)', color: '#7c5cfc' },
  sales:     { label: 'Sales',     bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  marketing: { label: 'Marketing', bg: 'rgba(244,63,94,0.12)',  color: '#f43f5e' },
  developer: { label: 'Developer', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
}

export const BOARD_TITLE: Record<string, string> = {
  admin:     'SyncUp Board',
  sales:     'Sales Board',
  marketing: 'Marketing Board',
  developer: 'Developer Board',
}
