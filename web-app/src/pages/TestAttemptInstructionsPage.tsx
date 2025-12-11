import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

const MAIN_INSTRUCTIONS: string[] = [
  "The test contains 3 sections having 100 questions.",
  "Each question has 5 options out of which only one is correct.",
  "You have to finish the test in 60 minutes.",
  "You will be awarded 1 mark for each correct answer and 0.25 will be deducted for each wrong answer.",
  "There is no negative marking for questions that you have not attempted.",
  "You can attempt this test only once. Make sure you complete the test before you submit or close the browser.",
];

export default function TestAttemptInstructionsPage() {
  const { testSetId } = useParams<{ testSetId: string }>();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<1 | 2>(1); // 1 = General instructions, 2 = Dynamic/test-specific instructions
  const [language, setLanguage] = useState<string>("");
  const [isDeclarationAccepted, setIsDeclarationAccepted] = useState(false);

  const startAttemptMutation = useMutation({
    mutationFn: async ({ testSetId, forceNew }: { testSetId: string; forceNew?: boolean }) => {
      const response = await api.post(`/attempts/start`, { testSetId, forceNew });
      return response.data.data;
    },
    onSuccess: (data) => {
      // Navigate to the attempt page after successfully starting the attempt
      navigate(`/test/${data.testSet?.id || data.testSetId}/attempt/${data.attemptId}`);
    },
    onError: (error: any) => {
      console.error("Failed to start attempt:", error);
      alert(error?.response?.data?.message || "Failed to start the test. Please try again.");
    },
  });

  const handleNext = () => {
    setActiveStep(2);
  };

  const handlePrevious = () => {
    setActiveStep(1);
  };

  const handleStartTest = () => {
    if (!isDeclarationAccepted) return;
    if (!testSetId) {
      alert("Test set ID is missing. Please go back and try again.");
      return;
    }

    // Start the attempt
    startAttemptMutation.mutate({ testSetId, forceNew: false });
  };

  return (
    <div className="relative min-h-screen bg-slate-50 pb-96">
      {/* Decorative Background */}
      <div className="absolute -top-10 -right-10 w-80 h-80 opacity-5 pointer-events-none">
        <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon
            points="160,20 300,120 240,280 80,280 20,120"
            fill="url(#instructionGradient)"
          />
          <defs>
            <linearGradient id="instructionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.15" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* MAIN CARD */}
      <div className="relative z-10 max-w-5xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8 text-slate-700 pb-24">
            {/* HEADER */}
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                {activeStep === 1
                  ? "General Instructions"
                  : "Test Instructions"}
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {activeStep === 1
                  ? "Please read the instructions carefully before attempting the test."
                  : "Read the following instructions carefully before starting the test."}
              </p>
            </div>

            {/* STEP 1: GENERAL INSTRUCTIONS (like original you gave) */}
            {activeStep === 1 && (
              <div className="space-y-6">
                <ol className="list-decimal pl-6 space-y-4">
                  <li>
                    The countdown timer at the top right corner will show the
                    remaining time. The test will automatically end when the
                    timer reaches zero. No manual submission is required.
                  </li>

                  <li>
                    The Question Palette on the right shows the status of each
                    question:
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 border border-slate-400 rounded" />
                        You have not visited the question yet.
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-red-400 rounded" />
                        You have not answered the question.
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 rounded" />
                        You have answered the question.
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-yellow-400 rounded" />
                        You have NOT answered the question, but marked it for review.
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-green-500 border-2 border-yellow-400 rounded" />
                        You have answered the question, but marked it for review.
                      </li>
                    </ul>
                  </li>
                </ol>

                <p>
                  <b>Mark for Review</b> means you want to check the question
                  again. If the answer is selected, it will still be evaluated
                  unless you change it later.
                </p>

                <h3 className="text-2xl font-semibold text-gray-900 mt-4">
                  Navigating to a Question
                </h3>

                <ol className="list-decimal pl-6 space-y-4">
                  <li>
                    To answer a question:
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                      <li>
                        Click on the question number in the palette to jump
                        directly (this does not save your current answer).
                      </li>
                      <li>
                        Click <b>Save &amp; Next</b> to save your answer and move
                        forward.
                      </li>
                      <li>
                        Click <b>Mark for Review &amp; Next</b> to save and flag
                        the question.
                      </li>
                    </ul>
                  </li>
                </ol>

                <p>
                  If you move to another question without saving, your answer
                  will <b>NOT</b> be stored.
                </p>

                <p>
                  You can view all questions using the <b>Question Paper</b>{" "}
                  button{" "}
                  <span className="text-red-500">
                    (to only view questions at a glance).
                  </span>
                </p>

                <h3 className="text-2xl font-semibold text-gray-900 mt-4">
                  Answering a Question
                </h3>

                <ol className="list-decimal pl-6 space-y-5">
                  <li>
                    <p className="font-medium">For MCQs:</p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                      <li>Select one of the four options.</li>
                      <li>
                        To deselect, click again or use{" "}
                        <b>Clear Response</b>.
                      </li>
                      <li>
                        You must click <b>Save &amp; Next</b> to save the answer.
                      </li>
                    </ul>
                  </li>

                  <li>
                    <p className="font-medium">For Numerical Questions:</p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                      <li>Use the on-screen numeric keypad.</li>
                      <li>Decimals (up to 4 places) are allowed.</li>
                      <li>
                        Use <b>Clear Response</b> to clear.
                      </li>
                      <li>
                        You must click <b>Save &amp; Next</b>.
                      </li>
                    </ul>
                  </li>

                  <li>
                    <b>Mark for Review</b> will still count the answer unless
                    changed.
                  </li>

                  <li>
                    To change an already answered question, select it and
                    re-answer.
                  </li>

                  <li>
                    Only <b>saved</b> or <b>answered + review-marked</b> questions
                    will be evaluated.
                  </li>

                  <li>Sections appear at the top. Click to switch between them.</li>

                  <li>
                    After the last question of a section, the next section opens
                    automatically.
                  </li>

                  <li>Hover on the section name to view status summary.</li>
                </ol>
              </div>
            )}

            {/* STEP 2: DYNAMIC / TEST-SPECIFIC INSTRUCTIONS (FROM ARRAY) */}
            {activeStep === 2 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-center text-sm font-medium text-slate-500 uppercase tracking-wide">
                    SBI PO Prelims
                  </h3>
                  <h2 className="text-center text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                    SBI PO Prelims Memory Based Paper (Held On: 4 August 2025 Shift 1)
                  </h2>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm font-semibold text-slate-700 gap-2">
                    <span>Duration: 60 Mins</span>
                    <span className="sm:text-right">Maximum Marks: 100</span>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">
                    Read the following instructions carefully:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 for-all-exams">
                    {MAIN_INSTRUCTIONS.map((ins, index) => (
                      <li key={index}>
                        <p>{ins}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* You can extend this with more bilingual/SSC style info using more arrays if needed */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* UPPER FIXED PANEL: LANGUAGE + DECLARATION (only on step 2) */}
      {activeStep === 2 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 sm:px-6 lg:px-8 z-40">
          <div className="max-w-5xl mx-auto bg-white border border-slate-200 shadow-sm rounded-lg p-4 sm:p-5">
            {/* Language selection */}
            <div className="mb-3">
              <label
                htmlFor="language"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Choose your default language:
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 block w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              >
                <option value="">-- Select --</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
              {language && (
                <p className="mt-1 text-xs text-red-500">
                  Please note, all questions will appear in your default language. This can be changed per question during the test.
                </p>
              )}
            </div>

            {/* Declaration */}
            <div className="mt-3">
              <p className="font-semibold text-sm mb-2">Declaration:</p>
              <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                  checked={isDeclarationAccepted}
                  onChange={(e) => setIsDeclarationAccepted(e.target.checked)}
                />
                <span>
                  I have read all the instructions carefully and have understood them. I agree
                  not to cheat or use unfair means in this examination. I understand that using
                  unfair means of any sort for my own or someone else’s advantage will lead to my
                  immediate disqualification. The decision of the examination authority will be
                  final in these matters and cannot be appealed.
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM FIXED FOOTER: CONTROLS */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Left side: "Go to Tests" link - only show on step 1 */}
          {activeStep === 1 && (
            <Link
              to="/"
              className="text-sm font-medium text-slate-700 underline hover:text-slate-900 transition"
            >
              Go to Tests
            </Link>
          )}
          {activeStep === 2 && (
            <div className="text-sm text-slate-500">
              {/* Empty space for step 2 */}
            </div>
          )}

          {/* Right side: Buttons */}
          <div className="flex items-center gap-3">
            {activeStep === 2 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Previous
              </button>
            )}

            {activeStep === 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-md bg-slate-700 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Next
              </button>
            )}

            {activeStep === 2 && (
              <div className="flex flex-col items-end">
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!isDeclarationAccepted || startAttemptMutation.isPending}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                    isDeclarationAccepted && !startAttemptMutation.isPending
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-emerald-100 text-emerald-400 cursor-not-allowed"
                  }`}
                >
                  {startAttemptMutation.isPending ? "Starting..." : "I am ready to begin"}
                </button>
                {!isDeclarationAccepted && (
                  <p className="mt-1 text-xs text-red-500">
                    Please accept the terms and conditions before proceeding.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
