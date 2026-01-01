import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Layout from '@/components/layout/Layout'
import BackgroundSVG from '@/components/home/BackgroundSVG'
import HeroSection from '@/components/home/HeroSection'
import NoticeBoard from '@/components/home/NoticeBoard'
import FeaturesSection from '@/components/home/FeaturesSection'
import WeeklyLiveExamBanner from '@/components/home/WeeklyLiveExamBanner'
import CategoriesSection from '@/components/home/CategoriesSection'
import HowItWorksSection from '@/components/home/HowItWorksSection'
import CTASection from '@/components/home/CTASection'

interface Category {
  _id: string
  name: string
  description: string
  price: number
  bannerImageUrl?: string
  isActive: boolean
}

export default function HomePage() {
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories')
      const categoriesData = response.data.data?.categories || response.data.data || []
      return Array.isArray(categoriesData) 
        ? categoriesData.filter((cat: Category) => cat.isActive)
        : []
    },
  })

  // const { data: notices, isLoading: noticesLoading } = useQuery({
  //   queryKey: ['notices'],
  //   queryFn: async () => {
  //     const response = await api.get('/notices?active=true')
  //     return response.data.data || []
  //   },
  // })

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Background SVG Patterns */}
        <BackgroundSVG />

        {/* Hero Section */}
        <HeroSection categories={categories} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {/* Notice Board */}
          {/* <NoticeBoard notices={notices} isLoading={noticesLoading} /> */}

          {/* Categories Section */}
          <CategoriesSection categories={categories} isLoading={categoriesLoading} />

          {/* Key Features Section */}
          <FeaturesSection />

          {/* Weekly Live Exam Banner */}
          {/* <WeeklyLiveExamBanner /> */}

          {/* How It Works Section */}
          <HowItWorksSection />

          {/* CTA Section */}
          <CTASection categories={categories} />
        </div>
      </div>
    </Layout>
  )
}
