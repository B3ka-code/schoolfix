import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { Toaster } from './components/Toaster'
import { RequireAuth, RequireRole } from './components/Guards'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import IssuesPage from './pages/IssuesPage'
import NewIssuePage from './pages/NewIssuePage'
import IssueDetailPage from './pages/IssueDetailPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster />
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<IssuesPage />} />
              <Route path="new" element={<NewIssuePage />} />
              <Route path="issues/:id" element={<IssueDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route element={<RequireRole admin />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>
              <Route path="*" element={<p className="text-mute">Такой страницы нет.</p>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
