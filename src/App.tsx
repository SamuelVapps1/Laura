import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import { AuthProvider } from "./auth/AuthProvider"
import { RequireUnlock } from "./auth/RequireUnlock"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { AppLayout } from "./components/layout/AppLayout"
import { AppBusyProvider } from "./context/AppBusyContext"
import { DashboardPage } from "./pages/DashboardPage"
import { CalendarPage } from "./pages/CalendarPage"
import { OwnersPage } from "./pages/OwnersPage"
import { OwnerDetailPage } from "./pages/OwnerDetailPage"
import { DogsPage } from "./pages/DogsPage"
import { DogDetailPage } from "./pages/DogDetailPage"
import { DogGalleryPage } from "./pages/DogGalleryPage"
import { TagsPage } from "./pages/TagsPage"
import { ReportsPage } from "./pages/ReportsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { LoginPage } from "./pages/LoginPage"

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <ErrorBoundary>
        <LoginPage />
      </ErrorBoundary>
    ),
  },
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/",
    element: (
      <RequireUnlock>
        <ErrorBoundary>
          <AppLayout />
        </ErrorBoundary>
      </RequireUnlock>
    ),
    children: [
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "calendar",
        element: <CalendarPage />,
      },
      {
        path: "calendar/appt/:appointmentId",
        element: <CalendarPage />,
      },
      {
        path: "owners",
        element: <OwnersPage />,
      },
      {
        path: "owners/:ownerId",
        element: <OwnerDetailPage />,
      },
      {
        path: "dogs",
        element: <DogsPage />,
      },
      {
        path: "dogs/:dogId/gallery",
        element: <DogGalleryPage />,
      },
      {
        path: "dogs/:dogId",
        element: <DogDetailPage />,
      },
      {
        path: "tags",
        element: <TagsPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
])

export function App() {
  return (
    <AuthProvider>
      <AppBusyProvider>
        <RouterProvider router={router} />
      </AppBusyProvider>
    </AuthProvider>
  )
}
