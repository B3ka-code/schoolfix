export type Role = 'student' | 'teacher' | 'staff' | 'admin' | 'super_admin'
export type IssueStatus = 'new' | 'in_progress' | 'resolved' | 'rejected'
export type IssueCategory = 'equipment' | 'plumbing' | 'electrical' | 'furniture' | 'other'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface Issue {
  id: string
  author_id: string
  author_name: string
  title: string
  description: string
  category: IssueCategory
  status: IssueStatus
  photo_path: string | null
  location: string
  created_at: string
  updated_at: string
}

export interface IssueComment {
  id: string
  issue_id: string
  author_id: string
  author_name: string
  author_role: Role | null
  text: string
  created_at: string
}

export interface RoleRequest {
  id: string
  user_id: string
  requested_role: Role
  status: RequestStatus
  created_at: string
  reviewed_at: string | null
  profiles?: { full_name: string; email: string } | null
}

export interface InviteCode {
  id: string
  role: Role
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  note: string | null
  created_at: string
}

export interface NewIssue {
  title: string
  description: string
  category: IssueCategory
  location: string
}

// Это только UX-хелперы. Настоящая проверка прав — RLS и RPC в schema.sql.
export const isTriage = (r?: Role | null) => r === 'staff' || r === 'admin' || r === 'super_admin'
export const isAdmin = (r?: Role | null) => r === 'admin' || r === 'super_admin'

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Ученик',
  teacher: 'Учитель',
  staff: 'Техперсонал',
  admin: 'Администратор',
  super_admin: 'Суперадмин',
}

export const CATEGORY_LABEL: Record<IssueCategory, string> = {
  equipment: 'Техника',
  plumbing: 'Сантехника',
  electrical: 'Электрика',
  furniture: 'Мебель',
  other: 'Другое',
}

// Классы записаны целиком, иначе Tailwind вырежет их при сборке.
export const STATUS_STYLE: Record<IssueStatus, { label: string; text: string; bg: string; edge: string }> = {
  new: { label: 'Новая', text: 'text-st-new', bg: 'bg-st-new/10', edge: 'border-l-st-new' },
  in_progress: { label: 'В работе', text: 'text-st-progress', bg: 'bg-st-progress/10', edge: 'border-l-st-progress' },
  resolved: { label: 'Решена', text: 'text-st-resolved', bg: 'bg-st-resolved/10', edge: 'border-l-st-resolved' },
  rejected: { label: 'Отклонена', text: 'text-st-rejected', bg: 'bg-st-rejected/10', edge: 'border-l-st-rejected' },
}
