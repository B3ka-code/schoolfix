import { PHOTO_BUCKET, supabase } from './supabase'
import { humanizeError } from './errors'
import { toast } from './toast'
import type {
  InviteCode, Issue, IssueComment, IssueStatus, NewIssue, Profile, Role, RoleRequest,
} from './types'

export type Result<T> = { ok: true; data: T } | { ok: false }

// ЕДИНСТВЕННОЕ место, где вызываются supabase.from()/rpc()/storage.
// try/catch + toast — здесь, поэтому тихих ошибок в консоли не бывает.
export async function run<T>(
  action: string,
  fn: () => PromiseLike<{ data: T | null; error: unknown }>,
): Promise<Result<T>> {
  try {
    const { data, error } = await fn()
    if (error) throw error
    return { ok: true, data: data as T }
  } catch (e) {
    console.error(action, e)
    toast.error(`${action}. ${humanizeError(e)}`)
    return { ok: false }
  }
}

const ALLOWED_PHOTOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO = 5 * 1024 * 1024

export const api = {
  // ---- профиль / пользователи
  getMyProfile: (uid: string) =>
    run<Profile>('Не удалось загрузить профиль', () => supabase.from('profiles').select('*').eq('id', uid).single()),
  listUsers: () =>
    run<Profile[]>('Не удалось загрузить пользователей', () =>
      supabase.from('profiles').select('*').order('created_at', { ascending: false })),
  setUserRole: (id: string, role: Role) =>
    run<Profile>('Не удалось сменить роль', () => supabase.rpc('admin_set_user_role', { p_user_id: id, p_role: role }).single()),
  setUserActive: (id: string, active: boolean) =>
    run<Profile>('Не удалось изменить доступ', () => supabase.rpc('admin_set_user_active', { p_user_id: id, p_active: active }).single()),

  // ---- заявки (issues)
  listIssues: () =>
    run<Issue[]>('Не удалось загрузить заявки', () =>
      supabase.from('issues').select('*').order('created_at', { ascending: false })),
  getIssue: (id: string) =>
    run<Issue | null>('Не удалось загрузить заявку', () => supabase.from('issues').select('*').eq('id', id).maybeSingle()),
  setIssueStatus: (id: string, status: IssueStatus) =>
    run<Issue>('Не удалось изменить статус', () =>
      supabase.from('issues').update({ status }).eq('id', id).select().single()),
  createIssue: (input: NewIssue, uid: string, file: File | null) =>
    run<Issue>('Не удалось отправить заявку', async () => {
      let photo_path: string | null = null
      if (file) {
        if (!ALLOWED_PHOTOS.includes(file.type)) throw new Error('Фото должно быть в формате JPG, PNG или WebP')
        if (file.size > MAX_PHOTO) throw new Error('Фото больше 5 МБ')
        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        photo_path = `${uid}/${crypto.randomUUID()}.${ext}`
        const up = await supabase.storage.from(PHOTO_BUCKET).upload(photo_path, file, { contentType: file.type })
        if (up.error) return { data: null, error: up.error }
      }
      const res = await supabase.from('issues').insert({ ...input, photo_path }).select().single()
      if (res.error && photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([photo_path]) // не оставляем сирот
      return res
    }),
  photoUrl: (path: string) =>
    run<{ signedUrl: string }>('Не удалось загрузить фото', () =>
      supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600)),

  // ---- комментарии
  listComments: (issueId: string) =>
    run<IssueComment[]>('Не удалось загрузить комментарии', () =>
      supabase.from('issue_comments').select('*').eq('issue_id', issueId).order('created_at', { ascending: true })),
  addComment: (issueId: string, text: string) =>
    run<IssueComment>('Не удалось отправить комментарий', () =>
      supabase.from('issue_comments').insert({ issue_id: issueId, text }).select().single()),

  // ---- роли и коды
  redeemCode: (code: string) =>
    run<RoleRequest>('Не удалось применить код', () => supabase.rpc('redeem_invite_code', { p_code: code }).single()),
  myRoleRequests: () =>
    run<RoleRequest[]>('Не удалось загрузить ваши заявки на роль', () =>
      supabase.from('role_requests').select('id,user_id,requested_role,status,created_at,reviewed_at').order('created_at', { ascending: false })),
  listRoleRequests: () =>
    run<RoleRequest[]>('Не удалось загрузить заявки на роли', () =>
      supabase.from('role_requests')
        .select('id,user_id,requested_role,status,created_at,reviewed_at,profiles!role_requests_user_id_fkey(full_name,email)')
        .order('created_at', { ascending: false }).limit(100)
        .returns<RoleRequest[]>()), // embed many-to-one: рантайм отдаёт объект, а не массив
  reviewRequest: (id: string, approve: boolean) =>
    run<RoleRequest>('Не удалось обработать заявку', () =>
      supabase.rpc('admin_review_role_request', { p_request_id: id, p_approve: approve }).single()),
  listCodes: () =>
    // колонки перечислены явно: на code_hash у клиента нет права SELECT
    run<InviteCode[]>('Не удалось загрузить коды', () =>
      supabase.from('invite_codes').select('id,role,max_uses,used_count,expires_at,is_active,note,created_at').order('created_at', { ascending: false })),
  createCode: (role: Role, maxUses: number, days: number, note: string) =>
    run<string>('Не удалось создать код', () =>
      supabase.rpc('create_invite_code', { p_role: role, p_max_uses: maxUses, p_expires_in_days: days, p_note: note || null })),
  setCodeActive: (id: string, active: boolean) =>
    run<null>('Не удалось изменить код', () => supabase.rpc('admin_set_invite_active', { p_code_id: id, p_active: active })),
}
