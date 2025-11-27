import React from 'react'
import { FiLoader } from 'react-icons/fi'
import cn from 'classnames'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullScreen?: boolean
  inline?: boolean
}

export function Loader({ size = 'md', className, fullScreen = false, inline = false }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        <FiLoader className={cn('animate-spin text-blue-600', sizeClasses[size], className)} />
      </div>
    )
  }

  if (inline) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiLoader className={cn('animate-spin text-blue-600', sizeClasses[size], className)} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-8">
      <FiLoader className={cn('animate-spin text-blue-600', sizeClasses[size], className)} />
    </div>
  )
}

export default Loader

