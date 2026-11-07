import React, { useState, useEffect } from 'react'
import { QuizView } from './QuizView'
import { AttemptDetail } from './AttemptDetail'
import { MaterialsManager } from './MaterialsManager'
import { QuizzesManager } from './QuizzesManager'
import { StudyStats } from './StudyStats'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { useQuiz } from '@/hooks/useQuiz'
import { loadProgressData } from '@/lib/study/server-data'

export const StudyWorkspace = () => {
  const [currentView, setCurrentView] = useState<'home' | 'materials' | 'quizzes' | 'quiz' | 'history' | 'progress'>('home')
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const progressStats = loadProgressData()

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true)
    setQuizError(null)
    try {
      // Gọi API tạo quiz - sẽ được implement trong hook hoặc component con
      // Ví dụ: await generateQuizAPI()
    } catch (err) {
      setQuizError('Không thể tạo bài kiểm tra. Vui lòng thử lại sau.')
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-canvas text-ink">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-brand-50 border-r border-border p-4 flex-shrink-0">
        <div className="mb-6">
          <h2 className="font-bold text-ink text-lg tracking-tighter">StudyAI</h2>
          <p className="text-sm text-slate-500 mt-1">Trợ lý ôn tập thông minh</p>
        </div>
        <ul className="space-y-2">
          <li>
            <Button
              variant="outline"
              onClick={() => setCurrentView('home')}
              className="w-full justify-start"
            >
              Trang chủ
            </Button>
          </li>
          <li>
            <Button
              variant="outline"
              onClick={() => setCurrentView('materials')}
              className="w-full justify-start"
            >
              Tài liệu của tôi
            </Button>
          </li>
          <li>
            <Button
              variant="outline"
              onClick={() => setCurrentView('quizzes')}
              className="w-full justify-start"
            >
              Bài kiểm tra của tôi
            </Button>
          </li>
          <li>
            <Button
              variant="outline"
              onClick={() => setCurrentView('progress')}
              className="w-full justify-start"
            >
              Tiến độ học tập
            </Button>
          </li>
          <li>
            <Button
              variant="outline"
              onClick={() => setCurrentView('history')}
              className="w-full justify-start"
            >
              Lịch sử làm bài
            </Button>
          </li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {currentView === 'home' && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <h1 className="text-4xl font-bold text-ink mb-4">Chào mừng đến với StudyAI</h1>
            <p className="text-slate-600 text-lg mb-6">
              Tải tài liệu của bạn để tạo bài kiểm tra bằng AI miễn phí.
            </p>
            <Button onClick={() => setCurrentView('materials')} className="mx-auto">
              Tải tài liệu của bạn
            </Button>
          </div>
        )}

        {currentView === 'materials' && (
          <MaterialsManager onQuizCreated={() => setCurrentView('quizzes')} />
        )}

        {currentView === 'quizzes' && (
          <QuizzesManager onStartQuiz={handleGenerateQuiz} />
        )}

        {currentView === 'quiz' && (
          <QuizView
            isLoading={isGeneratingQuiz}
            onError={quizError}
            onClose={() => setCurrentView('quizzes')}
          />
        )}

        {currentView === 'attempt' && (
          <AttemptDetail onClose={() => setCurrentView('quizzes')} />
        )}

        {currentView === 'progress' && (
          <StudyStats stats={progressStats} />
        )}

        {currentView === 'history' && (
          <div className="prose max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-ink mb-4">Lịch sử làm bài</h1>
            <p className="text-slate-500 mb-6">
              Tất cả các lượt nộp bài của bạn sẽ xuất hiện ở đây.
            </p>
            {/* QuizHistory component would go here */}
          </div>
        )}

        {/* Error Boundary for Quiz Generation */}
        {quizError && (
          <div className="fixed top-4 left-4 right-4 z-50 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm text-red-700 max-w-2xl mx-auto">
            <p className="font-medium">{quizError}</p>
          </div>
        )}
      </div>
    </main>
  )
}
