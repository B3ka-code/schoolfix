import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { configured } from './lib/supabase'

function ConfigError() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Не настроено подключение к Supabase</h1>
      <p className="mt-3 text-sm text-mute">
        Скопируйте <code>.env.example</code> в <code>.env</code>, впишите VITE_SUPABASE_URL и
        VITE_SUPABASE_ANON_KEY, затем перезапустите <code>npm run dev</code>.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode>{configured ? <App /> : <ConfigError />}</StrictMode>)
