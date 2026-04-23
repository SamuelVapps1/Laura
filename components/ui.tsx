import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("bg-white rounded-2xl border border-purple-100 shadow-sm", className)}>
    {children}
  </div>
)

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(({ label, error, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      ref={ref}
      className={cn(
        "px-4 py-2.5 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition placeholder:text-gray-400",
        error && "border-red-400 focus:ring-red-400",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))
Input.displayName = "Input"

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }
>(({ label, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea
      ref={ref}
      rows={3}
      className={cn(
        "px-4 py-2.5 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition placeholder:text-gray-400 resize-none",
        className
      )}
      {...props}
    />
  </div>
))
Textarea.displayName = "Textarea"

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
>(({ label, className, children, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      ref={ref}
      className={cn(
        "px-4 py-2.5 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition",
        className
      )}
      {...props}
    >
      {children}
    </select>
  </div>
))
Select.displayName = "Select"

export const Button = ({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost"
}) => (
  <button
    className={cn(
      "px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
      variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-400",
      variant === "secondary" && "bg-brand-100 text-brand-700 hover:bg-brand-200 focus:ring-brand-400",
      variant === "danger" && "bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-400",
      variant === "ghost" && "text-gray-600 hover:bg-gray-100 focus:ring-gray-300",
      className
    )}
    {...props}
  >
    {children}
  </button>
)

export const Badge = ({
  children,
  color = "purple",
}: {
  children: React.ReactNode
  color?: "purple" | "amber" | "green" | "red" | "gray"
}) => {
  const colors = {
    purple: "bg-brand-100 text-brand-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-600",
    gray: "bg-gray-100 text-gray-600",
  }
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", colors[color])}>
      {children}
    </span>
  )
}
