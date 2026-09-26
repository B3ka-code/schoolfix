// Превращает ошибку Supabase/сети/RPC в понятный текст для пользователя.
export function humanizeError(e: unknown): string {
  if (e && typeof e === 'object') {
    const { message = '', code = '' } = e as { message?: string; code?: string }
    if (code === '42501' || /row-level security|permission denied/i.test(message)) return 'Недостаточно прав для этого действия'
    if (code === 'PGRST116') return 'Запись не найдена или нет прав на её изменение'
    if (code === '23505') return 'Такая запись уже существует'
    if (code === '23514') return 'Данные не прошли проверку — проверьте длину полей'
    if (code === 'PGRST301' || /jwt/i.test(message)) return 'Сессия истекла — войдите снова'
    if (/Invalid login credentials/i.test(message)) return 'Неверная почта или пароль'
    if (/already registered/i.test(message)) return 'Этот email уже зарегистрирован'
    if (/Email not confirmed/i.test(message)) return 'Подтвердите почту по ссылке из письма'
    if (/Password should be/i.test(message)) return 'Пароль слишком короткий — минимум 8 символов'
    if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Нет связи с сервером. Проверьте интернет'
    if (code === 'PGRST202' || /Could not find the function/i.test(message))
      return 'На сервере нет нужной функции — примените supabase/schema.sql целиком'
    if (message) return message // сообщения из raise exception в RPC уже на русском
  }
  return 'Что-то пошло не так. Попробуйте ещё раз'
}
