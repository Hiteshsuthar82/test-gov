import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import {
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiLock,
  FiX,
  FiPlay,
  FiEye,
  FiChevronRight,
  FiChevronDown,
  FiUsers,
  FiGlobe,
  FiAward,
  FiMonitor,
  FiStar,
  FiZap,
  FiArrowRight,
  FiMoreVertical,
  FiBookOpen,
} from "react-icons/fi";
import { useAuthStore } from "@/store/authStore";

interface TestSet {
  _id: string;
  name: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  attemptCount?: number;
  categoryId: string;
  isActive: boolean;
  sectionId?: string;
  subsectionId?: string;
  price?: number;
}

interface CategorySection {
  sectionId: string;
  name: string;
  order: number;
  subsections: Array<{
    subsectionId: string;
    name: string;
    order: number;
  }>;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  bannerImageUrl?: string;
  totalSetsCount?: number;
  sections?: CategorySection[];
  updatedAt?: string;
  userCount?: number;
  languages?: string[];
  price?: number;
  freeTests?: number;
}

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubsection, setSelectedSubsection] = useState<string | null>(
    null
  );

  const { data: categoryData, isLoading: isLoadingCategory } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const response = await api.get(`/categories/${categoryId}/details`);
      return response.data.data;
    },
    enabled: !!categoryId,
  });
  const category: Category | undefined = categoryData?.category;

  const { data: subscriptionStatus, isLoading: isLoadingSubscription } =
    useQuery({
      queryKey: ["subscriptionStatus", categoryId],
      queryFn: async () => {
        try {
          const response = await api.get(
            `/subscriptions/check-status/${categoryId}`
          );
          return response.data.data;
        } catch {
          return null;
        }
      },
      enabled: !!categoryId,
    });

  const isSubscriptionApproved = subscriptionStatus?.status === "APPROVED";

  // Fetch all test sets for counting (no pagination)
  const { data: allTestSetsForCount, isLoading: isLoadingAllTestSets } =
    useQuery({
      queryKey: ["allTestSetsForCount", categoryId, subscriptionStatus?.status],
      queryFn: async () => {
        const approved = subscriptionStatus?.status === "APPROVED";
        try {
          if (approved) {
            const response = await api.get(
              `/sets/categories/${categoryId}/sets?limit=10000`
            );
            return response.data.data?.sets || [];
          }
        } catch (error: any) {
          // Continue to public endpoint
        }
        const response = await api.get(
          `/sets/categories/${categoryId}/sets/public?limit=10000`
        );
        return response.data.data?.sets || [];
      },
      enabled: !!categoryId && subscriptionStatus !== undefined,
      retry: false,
    });

  // Fetch test sets with pagination and filtering
  const { data: testSetsData, isLoading: isLoadingTestSets } = useQuery({
    queryKey: [
      "testSets",
      categoryId,
      subscriptionStatus?.status,
      selectedSection,
      selectedSubsection,
    ],
    queryFn: async () => {
      const approved = subscriptionStatus?.status === "APPROVED";
      const params = new URLSearchParams();
      if (selectedSection) params.append("sectionId", selectedSection);
      if (selectedSubsection) params.append("subsectionId", selectedSubsection);

      try {
        if (approved) {
          const response = await api.get(
            `/sets/categories/${categoryId}/sets?${params.toString()}`
          );
          return response.data.data;
        }
      } catch (error: any) {
        // Continue to public endpoint
      }
      const response = await api.get(
        `/sets/categories/${categoryId}/sets/public?${params.toString()}`
      );
      return response.data.data;
    },
    enabled: !!categoryId && subscriptionStatus !== undefined,
    retry: false,
  });

  const testSets = testSetsData?.sets || [];
  const allTestSets = allTestSetsForCount || [];

  // Fetch all attempts for this category
  const { data: allAttempts, isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["allAttempts", categoryId],
    queryFn: async () => {
      try {
        const response = await api.get(`/attempts?categoryId=${categoryId}`);
        return response.data.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!categoryId && isSubscriptionApproved,
  });

  // Check if all critical APIs are loaded (for initial page load)
  const isInitialLoad =
    isLoadingCategory || isLoadingSubscription || isLoadingAllTestSets;
  const isAllDataLoaded =
    !isLoadingCategory &&
    !isLoadingSubscription &&
    !isLoadingAllTestSets &&
    (!isSubscriptionApproved || !isLoadingAttempts);

  const { user } = useAuthStore();

  // Fetch leaderboard data for all test sets to get ranks
  const { data: leaderboardData } = useQuery({
    queryKey: ["leaderboard", categoryId, user?.id, testSets],
    queryFn: async () => {
      if (!categoryId || !user?.id || !testSets || testSets.length === 0)
        return {};
      try {
        // Fetch leaderboard for each test set
        const rankMap: Record<
          string,
          { rank: number; totalParticipants: number }
        > = {};

        await Promise.all(
          testSets.map(async (set: TestSet) => {
            try {
              const response = await api.get(
                `/leaderboard?categoryId=${categoryId}&testSetId=${set._id}`
              );
              const leaderboard = response.data.data?.leaderboard || [];
              const totalParticipants =
                response.data.data?.pagination?.total || leaderboard.length;

              const userEntry = leaderboard.find((entry: any) => {
                const entryUserId =
                  entry.userId?._id || entry.userId?.toString() || entry.userId;
                return (
                  entryUserId === user.id || entryUserId?.toString() === user.id
                );
              });

              if (userEntry) {
                rankMap[set._id] = {
                  rank: userEntry.rank || 0,
                  totalParticipants,
                };
              }
            } catch {
              // Skip if leaderboard fetch fails for this test set
            }
          })
        );

        return rankMap;
      } catch {
        return {};
      }
    },
    enabled:
      !!categoryId &&
      !!user?.id &&
      isSubscriptionApproved &&
      !!testSets &&
      testSets.length > 0,
  });

  // Get attempt status for a test set
  const getAttemptStatus = (testSetId: string) => {
    if (!allAttempts || !Array.isArray(allAttempts)) return null;

    const attempts = allAttempts.filter((attempt: any) => {
      const attemptTestSetId =
        attempt.testSetId?._id ||
        attempt.testSetId?.toString() ||
        attempt.testSetId;
      return (
        attemptTestSetId === testSetId ||
        attemptTestSetId?.toString() === testSetId
      );
    });

    if (attempts.length === 0) return null;

    const inProgress = attempts.find((a: any) => a.status === "IN_PROGRESS");
    if (inProgress) {
      return { status: "IN_PROGRESS", attemptId: inProgress._id };
    }

    const completed = attempts.find(
      (a: any) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED"
    );
    if (completed) {
      return { status: "COMPLETED", attemptId: completed._id };
    }

    return null;
  };

  // Calculate completed tests count
  const completedTestsCount = useMemo(() => {
    if (!allAttempts || !Array.isArray(allAttempts) || !testSets) return 0;
    const completedSetIds = new Set(
      allAttempts
        .filter(
          (a: any) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED"
        )
        .map(
          (a: any) => a.testSetId?._id || a.testSetId?.toString() || a.testSetId
        )
    );
    return testSets.filter((set: TestSet) => completedSetIds.has(set._id))
      .length;
  }, [allAttempts, testSets]);

  const totalTests = category?.totalSetsCount || allTestSets?.length || 0;
  const progressPercentage =
    totalTests > 0 ? Math.round((completedTestsCount / totalTests) * 100) : 0;

  // Get section filter options (for tabs)
  const sectionFilters = useMemo(() => {
    if (!category?.sections) return [];
    return category.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        sectionId: section.sectionId,
        name: section.name,
        count:
          allTestSets?.filter(
            (set: TestSet) => set.sectionId === section.sectionId
          ).length || 0,
      }));
  }, [category, allTestSets]);

  // Set first section as selected by default
  useEffect(() => {
    if (sectionFilters.length > 0 && !selectedSection) {
      setSelectedSection(sectionFilters[0].sectionId);
    }
  }, [sectionFilters, selectedSection]);

  // Get subsection filter options (for filter bar - only for selected section)
  const subsectionFilters = useMemo(() => {
    if (!category?.sections || !selectedSection) return [];
    const section = category.sections.find(
      (s) => s.sectionId === selectedSection
    );
    if (!section) return [];

    return section.subsections
      .sort((a, b) => a.order - b.order)
      .map((subsection) => {
        const count =
          allTestSets?.filter(
            (set: TestSet) =>
              set.sectionId === selectedSection &&
              set.subsectionId === subsection.subsectionId
          ).length || 0;
        return {
          subsectionId: subsection.subsectionId,
          name: subsection.name,
          count,
        };
      });
  }, [category, allTestSets, selectedSection]);

  // Filter test sets by selected section and subsection
  const filteredTestSets = useMemo(() => {
    if (!testSets) return [];
    let filtered = testSets;

    // Filter by section if selected
    if (selectedSection) {
      filtered = filtered.filter(
        (set: TestSet) => set.sectionId === selectedSection
      );
    }

    // Filter by subsection if selected
    if (selectedSubsection) {
      filtered = filtered.filter(
        (set: TestSet) => set.subsectionId === selectedSubsection
      );
    }

    return filtered;
  }, [testSets, selectedSection, selectedSubsection]);

  // Reset subsection when section changes
  const handleSectionChange = (sectionId: string | null) => {
    setSelectedSection(sectionId);
    setSelectedSubsection(null); // Reset subsection when section changes
  };

  const handleStartTest = async (testSetId: string) => {
    if (!subscriptionStatus || subscriptionStatus.status !== "APPROVED") {
      alert("Please subscribe to this category first");
      return;
    }

    const attemptStatus = getAttemptStatus(testSetId);
    if (attemptStatus?.status === "COMPLETED") {
      window.location.href = `/test/${testSetId}/results/${attemptStatus.attemptId}`;
      return;
    }

    try {
      const response = await api.get(
        `/attempts/in-progress/list?testSetId=${testSetId}`
      );
      const inProgress = response.data.data || [];

      if (inProgress.length > 0) {
        // Navigate to resume
        window.location.href = `/test/${testSetId}/attempt/${inProgress[0]._id}`;
      } else {
        navigate(`/test/${testSetId}/instructions`);
      }
    } catch (error) {
      navigate(`/test/${testSetId}/instructions`);
    }
  };

  // Get last attempt date for a test set
  const getLastAttemptDate = (testSetId: string) => {
    if (!allAttempts || !Array.isArray(allAttempts)) return null;
    const attempts = allAttempts.filter((attempt: any) => {
      const attemptTestSetId =
        attempt.testSetId?._id ||
        attempt.testSetId?.toString() ||
        attempt.testSetId;
      return (
        (attemptTestSetId === testSetId ||
          attemptTestSetId?.toString() === testSetId) &&
        (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED")
      );
    });
    if (attempts.length === 0) return null;
    const lastAttempt = attempts.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return lastAttempt.createdAt;
  };

  // Get attempt score and rank
  const getAttemptData = (testSetId: string) => {
    if (!allAttempts || !Array.isArray(allAttempts) || !testSets) return null;
    const attempts = allAttempts.filter((attempt: any) => {
      const attemptTestSetId =
        attempt.testSetId?._id ||
        attempt.testSetId?.toString() ||
        attempt.testSetId;
      return (
        (attemptTestSetId === testSetId ||
          attemptTestSetId?.toString() === testSetId) &&
        (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED")
      );
    });
    if (attempts.length === 0) return null;
    const bestAttempt = attempts.reduce((best: any, current: any) =>
      current.totalScore > (best?.totalScore || 0) ? current : best
    );
    const testSet = testSets.find((set: TestSet) => set._id === testSetId);
    return {
      score: bestAttempt.totalScore,
      totalMarks: testSet?.totalMarks || bestAttempt.testSetId?.totalMarks || 0,
      attemptId: bestAttempt._id,
    };
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format user count
  const formatUserCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Show full page shimmer only on initial load (not when section/subsection changes)
  if (isInitialLoad) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header Section Shimmer */}
            <div className="bg-white rounded-lg p-6 mb-6 bg-gradient-to-l from-purple-100 to-transparent relative overflow-visible animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2">
                  {/* Breadcrumbs Shimmer */}
                  <div className="mb-8">
                    <div className="h-4 bg-gray-200 rounded w-64"></div>
                  </div>

                  {/* Category Info Shimmer */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                      </div>
                    </div>
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                  </div>

                  {/* Statistics and Info Grid Shimmer */}
                  <div className="grid grid-cols-2 gap-10">
                    {/* Statistics Shimmer */}
                    <div className="mb-4">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="h-6 bg-gray-200 rounded w-32"></div>
                        <div className="h-6 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </div>
                    </div>

                    {/* Additional Info Shimmer */}
                    <div className="flex flex-col gap-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </div>
                  </div>
                </div>

                {/* Right side - Banking Combo Card Shimmer (for non-logged in) */}
                <div className="pl-6 relative">
                  <div className="absolute top-0 right-0 z-10 w-80 max-w-[280px]">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-5 shadow-xl relative overflow-visible">
                      {/* NEW Badge Shimmer */}
                      <div className="absolute -top-2 -right-2 z-10 w-12 h-6 bg-orange-500 rounded transform rotate-12"></div>

                      {/* Title and Price Section */}
                      <div className="mb-3">
                        <div className="h-6 bg-gray-700 rounded w-44 mb-2"></div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <div className="h-7 bg-gray-700 rounded w-16"></div>
                          <div className="h-3 bg-gray-700 rounded w-14"></div>
                          <div className="h-4 bg-gray-700 rounded w-12"></div>
                        </div>
                        <div className="h-3 bg-gray-700 rounded w-48"></div>
                      </div>

                      {/* Features List Shimmer */}
                      <div className="space-y-2 mb-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-700 rounded-full flex-shrink-0"></div>
                            <div className="h-3 bg-gray-700 rounded w-36"></div>
                          </div>
                        ))}
                      </div>

                      {/* Button Shimmer */}
                      <div className="h-9 bg-gray-700 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content Shimmer */}
              <div className="lg:col-span-2 space-y-6">
                <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>

                {/* Section Tabs Shimmer */}
                <div className="bg-white border-b border-gray-200">
                  <div className="flex gap-4 p-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-10 bg-gray-200 rounded w-32 animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Test Sets Shimmer */}
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg p-5 animate-pulse"
                    >
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="flex gap-6 mb-3">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-1 bg-gray-200 rounded w-full"></div>
                      <div className="flex justify-between mt-3">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Shimmer */}
              <div className="lg:col-span-1 space-y-6 mt-32">
                <div className="bg-white rounded-lg p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-4 bg-gray-200 rounded w-full"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section */}
          {category && (
            <div className="bg-white rounded-lg p-6 mb-6 bg-gradient-to-l from-purple-100 to-transparent relative overflow-visible">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2 ">
                  {/* Breadcrumbs */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 text-sm">
                      <Link
                        to="/"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Home
                      </Link>
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
                      <Link
                        to="/categories"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Categories
                      </Link>
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
                      <span className="text-purple-600">
                        {category?.name || "Category"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {category.bannerImageUrl ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                          <img
                            src={category.bannerImageUrl}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xl">
                            T
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                          {category.name}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                          <FiClock className="w-4 h-4" />
                          <span>
                            Last updated on {formatDate(category.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <FiMoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    {/* Statistics */}
                    <div className="mb-4">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          {totalTests} Total Tests
                        </span>
                        {category.freeTests !== undefined &&
                          category.freeTests !== null &&
                          Number(category.freeTests) > 0 && (
                            <span className="bg-green-500 text-white px-3 py-1 rounded text-sm font-semibold">
                              {category.freeTests} FREE TESTS
                            </span>
                          )}
                      </div>
                      {totalTests > 0 && (
                        <div className="mb-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-gray-600">
                              {completedTestsCount}/{totalTests} Tests
                            </span>
                            <span className="text-sm text-green-600 font-semibold">
                              {progressPercentage}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                      <button className="flex items-center gap-2 text-purple-600 hover:text-purple-700">
                        <span>Sections Info</span>
                        <FiChevronDown className="w-4 h-4" />
                      </button>
                      {category.userCount && category.userCount > 0 && (
                        <div className="flex items-center gap-2">
                          <FiUsers className="w-4 h-4" />
                          <span>
                            {formatUserCount(category.userCount)} Users
                          </span>
                        </div>
                      )}
                      {category.languages && category.languages.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FiGlobe className="w-4 h-4" />
                          <span>
                            {Array.isArray(category.languages)
                              ? category.languages.join(", ")
                              : category.languages}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Right side - Banking Combo Card (only for non-logged in users) */}
                <div className="pl-6 relative">
                  {!user && (
                    <div className="absolute top-0 right-0 z-10">
                      <Card className="bg-gradient-to-br from-gray-800 to-gray-900 text-white relative overflow-visible shadow-xl w-80 max-w-[280px]">
                        <div className="absolute -top-2 -right-2 z-10">
                          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded transform rotate-12">
                            NEW
                          </span>
                        </div>
                        <CardContent className="p-5">
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl font-bold">
                                Complete Banking Combo
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-2xl font-bold text-yellow-400">
                                ₹549
                              </span>
                              <span className="text-xs text-gray-400 line-through">
                                ₹2,999
                              </span>
                              <span className="text-xs bg-red-500 px-2 py-1 rounded">
                                82% OFF
                              </span>
                            </div>
                            <p className="text-xs text-gray-300">
                              Get access to all banking exam preparation
                              materials
                            </p>
                          </div>
                          <ul className="space-y-2 mb-4">
                            {[
                              "All Banking Test Series",
                              "Previous Year Papers",
                              "Unlimited Practice Tests",
                              "Live Mock Tests",
                              "Detailed Solutions",
                            ].map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <FiCheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <span className="text-xs">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <Link to="/register">
                            <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 text-sm">
                              Get Combo - ₹549
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 rounded-lg px-4 py-6">
              {/* Suggested Next Test */}
              {isLoadingTestSets ? (
                <div className="mb-6">
                  <div className="h-9 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                  <Card className="border-2 border-gray-200 animate-pulse">
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="flex gap-4">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="h-10 bg-gray-200 rounded w-28"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-40 mt-3"></div>
                    </div>
                  </Card>
                </div>
              ) : (
                testSets &&
                testSets.length > 0 &&
                isSubscriptionApproved &&
                (() => {
                  // Find the first test set that hasn't been completed
                  const suggestedTest =
                    testSets.find((set: TestSet) => {
                      const status = getAttemptStatus(set._id);
                      return !status || status.status !== "COMPLETED";
                    }) || testSets[0];

                  if (!suggestedTest) return null;

                  const attemptStatus = getAttemptStatus(suggestedTest._id);
                  const price = category?.price;
                  const isFree =
                    !price ||
                    Number(price) === 0 ||
                    (category?.freeTests !== undefined &&
                      category.freeTests > 0);

                  return (
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Suggested Next Test
                      </h2>
                      <Card className="border-2 border-gray-200 hover:shadow-lg transition-shadow relative">
                        {isFree && (
                          <div className="absolute top-3 left-3 z-10">
                            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                              FREE
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-start justify-between gap-4 px-5 py-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-gray-900 text-lg">
                                  {suggestedTest.name}
                                </h3>
                                {category?.userCount &&
                                  category.userCount > 0 && (
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                      <FiZap className="w-4 h-4 text-yellow-500" />
                                      <span>
                                        {formatUserCount(category.userCount)}{" "}
                                        Users
                                      </span>
                                    </div>
                                  )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <span>?</span>
                                  <span>
                                    {suggestedTest.totalQuestions || 0}{" "}
                                    Questions
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <FiFileText className="w-4 h-4" />
                                  <span>{suggestedTest.totalMarks} Marks</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <FiClock className="w-4 h-4" />
                                  <span>
                                    {suggestedTest.durationMinutes} Mins
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {attemptStatus?.status === "IN_PROGRESS" ? (
                                <Link
                                  to={`/test/${suggestedTest._id}/attempt/${attemptStatus.attemptId}`}
                                >
                                  <Button className="bg-green-600 hover:bg-green-700">
                                    <FiPlay className="mr-2" />
                                    Resume
                                  </Button>
                                </Link>
                              ) : attemptStatus?.status === "COMPLETED" ? (
                                <Link
                                  to={`/test/${suggestedTest._id}/results/${attemptStatus.attemptId}`}
                                >
                                  <Button variant="outline">
                                    <FiEye className="mr-2" />
                                    View Result
                                  </Button>
                                </Link>
                              ) : (
                                <Button
                                  onClick={() =>
                                    handleStartTest(suggestedTest._id)
                                  }
                                  className="bg-purple-500 hover:bg-purple-600"
                                >
                                  Start Now
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-purple-600 px-4 py-1 bg-gray-100">
                            <FiGlobe className="w-4 h-4" />
                            <span>
                              {category?.languages
                                ? Array.isArray(category.languages)
                                  ? category.languages.join(", ")
                                  : category.languages
                                : "English, Hindi"}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })()
              )}

              {/* Main Category Heading */}
              {category && (
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {category.name} All Tests ({totalTests})
                </h2>
              )}

              {/* Section Tabs - Full width with white background */}
              {sectionFilters.length > 0 && (
                <div className="w-full bg-white mb-6 border-b border-gray-200">
                  <div className="flex items-center gap-0 overflow-x-auto">
                    {sectionFilters.map((filter) => (
                      <button
                        key={filter.sectionId}
                        onClick={() =>
                          handleSectionChange(
                            selectedSection === filter.sectionId
                              ? null
                              : filter.sectionId
                          )
                        }
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all bg-white border-b-2 ${
                          selectedSection === filter.sectionId
                            ? "text-purple-600 border-purple-600"
                            : "text-gray-700 border-transparent hover:text-gray-900"
                        }`}
                      >
                        {filter.name}({filter.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subsection Filter Bar - Only show when a section is selected and has more than one subsection */}
              {selectedSection && subsectionFilters.length > 1 && (
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-200">
                  <button
                    onClick={() => setSelectedSubsection(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      !selectedSubsection
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  {subsectionFilters.map((filter) => (
                    <button
                      key={filter.subsectionId}
                      onClick={() =>
                        setSelectedSubsection(
                          selectedSubsection === filter.subsectionId
                            ? null
                            : filter.subsectionId
                        )
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedSubsection === filter.subsectionId
                          ? "bg-purple-600 text-white border-b-2 border-purple-600"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                  {subsectionFilters.length > 6 && (
                    <button className="text-purple-600 hover:text-purple-700">
                      <FiChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Test Sets - Flat List Format */}
              {isLoadingTestSets ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg p-5 animate-pulse"
                    >
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="flex gap-6 mb-3">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-1 bg-gray-200 rounded w-full"></div>
                      <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTestSets && filteredTestSets.length > 0 ? (
                // Show test sets in reference image format
                <div className="space-y-3">
                  {filteredTestSets.map((testSet: TestSet) => {
                    const isLocked = !isSubscriptionApproved;
                    const attemptStatus = getAttemptStatus(testSet._id);
                    const attemptData = getAttemptData(testSet._id);
                    const lastAttemptDate = getLastAttemptDate(testSet._id);
                    const hasAttempted = !!attemptData;

                    return (
                      <Card
                        key={testSet._id}
                        className={`hover:shadow-md transition-shadow bg-white ${
                          isLocked ? "opacity-75 border-gray-300" : ""
                        }`}
                      >
                        <div className="">
                          {/* Title */}
                          <div className="px-5 py-4">
                            <h5 className="font-bold text-gray-900 mb-1 text-base">
                              {testSet.name}
                            </h5>

                            {/* Performance Metrics and Action Buttons Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                {hasAttempted ? (
                                  <>
                                    {/* Rank - shown when attempted */}
                                    {leaderboardData &&
                                      leaderboardData[testSet._id] && (
                                        <div className="flex items-center gap-2">
                                          <FiAward className="w-4 h-4 text-gray-600" />
                                          <span className="text-sm text-gray-700">
                                            {leaderboardData[testSet._id].rank}/
                                            {
                                              leaderboardData[testSet._id]
                                                .totalParticipants
                                            }{" "}
                                            Rank
                                          </span>
                                        </div>
                                      )}
                                    {/* Marks - shown when attempted */}
                                    {attemptData && (
                                      <div className="flex items-center gap-2">
                                        <FiFileText className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm text-gray-700">
                                          {attemptData.score}/
                                          {attemptData.totalMarks} Marks
                                        </span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {/* Questions Count - shown when not attempted */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-700">
                                        {testSet.totalQuestions || 0} Questions
                                      </span>
                                    </div>
                                    {/* Marks - shown when not attempted */}
                                    <div className="flex items-center gap-2">
                                      <FiFileText className="w-4 h-4 text-gray-600" />
                                      <span className="text-sm text-gray-700">
                                        {testSet.totalMarks} Marks
                                      </span>
                                    </div>
                                    {/* Time - shown when not attempted */}
                                    <div className="flex items-center gap-2">
                                      <FiClock className="w-4 h-4 text-gray-600" />
                                      <span className="text-sm text-gray-700">
                                        {testSet.durationMinutes} Mins
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Action Buttons - Solution/Analysis when attempted, Start Now/Unlock when not attempted */}
                              {hasAttempted && attemptData ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                                    onClick={() =>
                                      navigate(
                                        `/test/${testSet._id}/results/${attemptData.attemptId}`
                                      )
                                    }
                                  >
                                    Solution
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                                    onClick={() =>
                                      navigate(
                                        `/test/${testSet._id}/results/${attemptData.attemptId}`
                                      )
                                    }
                                  >
                                    Analysis
                                  </Button>
                                </div>
                              ) : isLocked ? (
                                <Link to={`/categories/${categoryId}/payment`}>
                                  <Button
                                    size="sm"
                                    className="bg-transparent text-purple-700 border border-purple-700 hover:bg-purple-100"
                                  >
                                    <FiLock className="mr-2" />
                                    Unlock
                                  </Button>
                                </Link>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-purple-500 hover:bg-purple-600"
                                  onClick={() => handleStartTest(testSet._id)}
                                >
                                  Start Now
                                </Button>
                              )}
                            </div>

                            {/* Progress Bar */}
                            {hasAttempted && attemptData && (
                              <div className="">
                                <div className="w-full bg-gray-200 rounded-full h-1 mt-3">
                                  <div
                                    className="bg-yellow-400 h-1 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${
                                        attemptData.totalMarks > 0
                                          ? (attemptData.score /
                                              attemptData.totalMarks) *
                                            100
                                          : 0
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Bottom Row: Languages, Attempted Date, Reattempt/Unlock */}
                          <div className="flex items-center justify-between border-t border-gray-200 py-1 px-4 bg-gray-100">
                            <div className="flex items-center gap-4">
                              {!hasAttempted &&
                                category?.languages &&
                                category.languages.length > 0 && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FiGlobe className="w-4 h-4 text-purple-600" />
                                    <span>
                                      {Array.isArray(category.languages)
                                        ? category.languages.join(", ")
                                        : category.languages}
                                    </span>
                                  </div>
                                )}
                              {lastAttemptDate && (
                                <span className="text-sm text-gray-500">
                                  Attempted on {formatDate(lastAttemptDate)}
                                </span>
                              )}
                            </div>

                            {hasAttempted && (
                              <div
                                // variant="outline"
                                // size="sm"
                                className="border-purple-500 text-purple-600 hover:bg-purple-50 flex items-center gap-1 hover:cursor-pointer px-2"
                                onClick={() => handleStartTest(testSet._id)}
                              >
                                Reattempt
                                <span className="bg-purple-400 rounded-full">
                                  <FiArrowRight className="w-4 h-4 text-white" />
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-gray-600">
                        No test series available in this category yet.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6 mt-32">
              {/* Subscription Card - Only for logged in users */}
              {user &&
                (!subscriptionStatus ||
                  subscriptionStatus.status !== "APPROVED") && (
                  <Card className="bg-gradient-to-br from-gray-800 to-gray-900 text-white relative overflow-hidden">
                    <div className="absolute top-2 right-2">
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded transform rotate-12">
                        NEW
                      </span>
                    </div>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl font-bold">testbook</span>
                          <span className="bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-bold">
                            PASS PRO
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          The Ultimate Subscription for Pro Aspirants
                        </p>
                      </div>
                      <ul className="space-y-3 mb-6">
                        {[
                          "All Test Series",
                          "All Prev. Year Paper",
                          "Unlimited Practice",
                          "Pro Live Tests",
                          "Unlimited Test Re-Attempts",
                        ].map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <FiCheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link to={`/categories/${categoryId}/payment`}>
                        <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3">
                          Get Pass Pro
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}

              {/* More Testseries for you */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    More Testseries for you
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        name: "SSC Reasoning PYP Mock Test Series (20k...)",
                        tests: "1810 Total tests | 3 Free Tests",
                      },
                      {
                        name: "SSC GK PYP Mock Test Series (20k+ Questions)",
                        tests: "1889 Total tests | 4 Free Tests",
                      },
                      {
                        name: "SSC Maths PYP Mock Test Series (20k+...)",
                        tests: "1744 Total tests | 4 Free Tests",
                      },
                    ].map((series, idx) => (
                      <Link
                        key={idx}
                        to="#"
                        className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm mb-1">
                              {series.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {series.tests}
                            </p>
                          </div>
                          <FiChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4 text-purple-600 border-purple-600"
                  >
                    View More
                  </Button>
                </CardContent>
              </Card>

              {/* Why Take this Test Series */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Why Take this Test Series ?
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <FiAward className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          All India Rank
                        </h4>
                        <p className="text-sm text-gray-600">
                          Compete with thousands of students across India
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <FiMonitor className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          Personal recommendation
                        </h4>
                        <p className="text-sm text-gray-600">
                          Recommendations for you based on your strong & weak
                          areas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <FiStar className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          No.1 Quality
                        </h4>
                        <p className="text-sm text-gray-600">
                          Designed by experts with years of experience. Based on
                          latest pattern
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
