import React from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { Button } from './button'
import cn from 'classnames'

interface PaginationProps {
  current: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  showSizeChanger?: boolean
  onPageSizeChange?: (size: number) => void
  className?: string
}

export function Pagination({
  current,
  total,
  pageSize,
  onChange,
  showSizeChanger = false,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const startItem = (current - 1) * pageSize + 1
  const endItem = Math.min(current * pageSize, total)

  const handlePrevious = () => {
    if (current > 1) {
      onChange(current - 1)
    }
  }

  const handleNext = () => {
    if (current < totalPages) {
      onChange(current + 1)
    }
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (current >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages === 0) return null

  return (
    <div className={cn('flex items-center justify-between mt-4', className)}>
      <div className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {total} results
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={current === 1}
        >
          <FiChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                  ...
                </span>
              )
            }

            const pageNum = page as number
            return (
              <Button
                key={pageNum}
                variant={current === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange(pageNum)}
                className={cn(
                  'min-w-[32px]',
                  current === pageNum && 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {pageNum}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={current === totalPages}
        >
          <FiChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export default Pagination

