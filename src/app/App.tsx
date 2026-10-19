import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { CategoryPage } from '../pages/CategoryPage'
import { ExercisePage } from '../pages/ExercisePage'
import { ExercisesPage } from '../pages/ExercisesPage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AdminLayout } from '../components/admin/AdminLayout'
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminExerciseFormPage } from '../pages/admin/AdminExerciseFormPage'
import { AdminExercisesPage } from '../pages/admin/AdminExercisesPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage'
import { AdminContentPage } from '../pages/admin/AdminContentPage'
import { TeacherGuard } from '../components/admin/TeacherGuard'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="categories/:slug" element={<CategoryPage />} />
        <Route path="exercises/:exerciseId" element={<ExercisePage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route path="admin" element={<TeacherGuard><AdminLayout /></TeacherGuard>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="exercises" element={<AdminExercisesPage />} />
        <Route path="exercises/new" element={<AdminExerciseFormPage />} />
        <Route path="exercises/:id/edit" element={<AdminExerciseFormPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="content" element={<AdminContentPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  )
}
