import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  children: React.ReactNode
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Dialog: React.FC<DialogProps> = ({ open, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative z-50">
        {children}
      </div>
    </div>
  )
}

export const DialogContent: React.FC<DialogContentProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-auto mx-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return <div className={cn("mb-4", className)} {...props} />
}

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => {
  return <h2 className={cn("text-xl font-semibold", className)} {...props} />
}

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => {
  return <p className={cn("text-sm text-gray-600", className)} {...props} />
}

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return <div className={cn("flex justify-end gap-2 mt-4", className)} {...props} />
}

