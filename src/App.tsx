import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppLayout } from "./components/layout/AppLayout"
import { CalendarPage } from "./pages/CalendarPage"
import { OwnersPage } from "./pages/OwnersPage"
import { DogsPage } from "./pages/DogsPage"
import { TagsPage } from "./pages/TagsPage"
import { SettingsPage } from "./pages/SettingsPage"

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <CalendarPage />,
      },
      {
        path: "calendar",
        element: <CalendarPage />,
      },
      {
        path: "owners",
        element: <OwnersPage />,
      },
      {
        path: "dogs",
        element: <DogsPage />,
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
  return <RouterProvider router={router} />
}
