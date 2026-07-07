import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import PaperWorkspace from './pages/PaperWorkspace'
import NewPaper from './pages/NewPaper'
import AdminDashboard from './pages/AdminDashboard'
import RecruitBoard from './pages/RecruitBoard'
import MyApplications from './pages/MyApplications'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/new" element={<NewPaper />} />
      <Route path="/paper/:id" element={<PaperWorkspace />} />
      <Route path="/recruit" element={<RecruitBoard />} />
      <Route path="/my-applications" element={<MyApplications />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  )
}
