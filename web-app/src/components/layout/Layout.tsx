import { ReactNode } from 'react'
import Navbar from './Navbar'

interface LayoutProps {
  children: ReactNode
  hideNavbar?: boolean
}

export default function Layout({ children, hideNavbar = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNavbar && <Navbar />}
      <main>{children}</main>
    </div>
  )
}

