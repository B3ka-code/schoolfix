import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)
export const PHOTO_BUCKET = 'issue-photos'

// Плейсхолдеры нужны, чтобы createClient не падал до показа нормального экрана ошибки.
export const supabase = createClient(url || 'http://localhost', key || 'missing-anon-key')
