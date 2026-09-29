// Superbase/желі/RPC қатесін пайдаланушыға түсінікті мәтінге айналдырады.
export function humanizeError(e: unknown): string {
  if (e && typeof e === 'object') {
    const { message = '', code = '' } = e as { message?: string; code?: string }
    if (code === '42501' || /row-level security|permission denied/i.test(message)) return 'Бұл әрекетке рұқсат жеткіліксіз'
    if (code === 'PGRST116') return 'Жазба табылмады немесе оны өзгертуге рұқсат жоқ'
    if (code === '23505') return 'Мұндай жазба бұрыннан бар'
    if (code === '23514') return 'Деректер тексеруден өтпеді — өрістердің ұзындығын тексеріңіз'
    if (code === 'PGRST301' || /jwt/i.test(message)) return 'Сеанс мерзімі бітті — қайта кіріңіз'
    if (/Invalid login credentials/i.test(message)) return 'Пошта немесе құпия сөз қате'
    if (/already registered/i.test(message)) return 'Бұл email бұрыннан тіркелген'
    if (/Email not confirmed/i.test(message)) return 'Хаттағы сілтеме арқылы поштаңызды растаңыз'
    if (/Password should be/i.test(message)) return 'Құпия сөз тым қысқа — кемінде 8 таңба керек'
    if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Сервермен байланыс жоқ. Интернетті тексеріңіз'
    if (code === 'PGRST202' || /Could not find the function/i.test(message))
      return 'Серверде қажетті функция жоқ — supabase/schema.sql толығымен қолданыңыз'
    if (message) return message // RPC-дегі raise exception хабарламалары қазақша болады
  }
  return 'Бірдеңе дұрыс болмады. Қайта көріңіз'
}
