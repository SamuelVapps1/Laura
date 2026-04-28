import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import { AuthProvider } from "./auth/AuthProvider"
import { RequireUnlock } from "./auth/RequireUnlock"
import { AppLayout } from "./components/layout/AppLayout"
import { CalendarPage } from "./pages/CalendarPage"
import { OwnersPage } from "./pages/OwnersPage"
import { OwnerDetailPage } from "./pages/OwnerDetailPage"
import { DogsPage } from "./pages/DogsPage"
import { DogDetailPage } from "./pages/DogDetailPage"
import { DogGalleryPage } from "./pages/DogGalleryPage"
import { TagsPage } from "./pages/TagsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { LoginPage } from "./pages/LoginPage"

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <Navigate to="/calendar" replace />,
  },
  {
    path: "/",
    element: (
      <RequireUnlock>
        <AppLayout />
      </RequireUnlock>
    ),
    children: [
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
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
])

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
