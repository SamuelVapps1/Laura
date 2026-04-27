import { NavLink } from "react-router-dom"
import { Calendar, Users, Dog, Tag, Settings } from "lucide-react"
import { t } from "@/i18n/sk"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/calendar", label: t("navCalendar"), icon: Calendar },
  { href: "/owners", label: t("navOwners"), icon: Users },
  { href: "/dogs", label: t("navDogs"), icon: Dog },
  { href: "/tags", label: t("navTags"), icon: Tag },
  { href: "/settings", label: t("navSettings"), icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="bg-gray-50 w-64 min-h-screen border-r border-gray-200">
      <nav className="p-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <NavLink
                to={href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
