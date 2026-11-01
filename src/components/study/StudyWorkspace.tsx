'use client'

import { useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { useQuizGeneration } from '@/hooks/useQuizGeneration'
import type { ClientQuiz } from '@/types/study'
import { QuizView } from './QuizView'
import { UploadPanel } from './UploadPanel'

export function StudyWorkspace() {
  const generation = useQuizGeneration()
  const [quiz, setQuiz] = useState<ClientQuiz | null>(null)
  const quizSectionRef = useRef<HTMLElement>(null)

  const handleGenerate = async (payload: Parameters<typeof generation.generate>[0]) => {
    const next = await generation.generate(payload)
    if (next) {
      setQuiz(next)
      window.setTimeout(() => {
        quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
    return next
  }

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section aria-labelledby="hero-heading" className="mb-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800">
            <Icon name="spark" className="size-3.5" />
            AI miễn phí · Cloudflare Workers AI
          </span>
          <h1
            id="hero-heading"
            className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]"
          >
            Biến tài liệu của bạn thành bài kiểm tra
            <span className="text-brand-600"> hiểu đúng lỗi sai.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Tải ảnh, PDF, DOCX hoặc dán ghi chú. StudyAI soạn câu hỏi tiếng Việt, chấm điểm trắc
            nghiệm thật và lưu tiến độ theo từng lượt làm bài — không cần tài khoản, không dùng thẻ.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
            {[
              'Không cần đăng ký',
              'Đáp án ẩn ở chế độ thi',
              'Tự luận không chấm tự động',
            ].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Icon name="check" className="size-4 text-emerald-600" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        <UploadPanel
          loading={generation.loading}
          stageLabel={generation.stageLabel}
          error={generation.error}
          quota={generation.quota}
          onGenerate={handleGenerate}
          onCancel={generation.cancel}
          onClearError={generation.clearError}
        />
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name="spark" className="size-5" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-ink">Cách hoạt động</h2>
          </div>
          <ol className="mt-4 grid gap-4">
            {[
              {
                title: 'Đưa nội dung vào',
                body: 'Dán ghi chú hoặc tải ảnh, PDF, DOCX, TXT. Tệp được đọc ngay trên máy chủ.',
              },
              {
                title: 'AI soạn câu hỏi',
                body: 'Cloudflare Workers AI tạo câu hỏi tiếng Việt bám sát tài liệu, có đáp án và giải thích.',
              },
              {
                title: 'Làm bài và xem lỗi sai',
                body: 'Trắc nghiệm được chấm thật. Tự luận hiện đáp án mẫu nhưng không tự chấm điểm.',
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            Không cần tài khoản. Bài kiểm tra được giữ trong bộ nhớ máy chủ 2 giờ để chấm điểm, sau
            đó tự xoá. Hạn mức miễn phí mỗi ngày được ghi ở trang Cài đặt.
          </p>
        </aside>
      </section>

      <section
        id="practice"
        ref={quizSectionRef}
        aria-labelledby="practice-heading"
        className="mt-8 scroll-mt-24"
      >
        <h2 id="practice-heading" className="sr-only">
          Bài luyện tập
        </h2>
        {quiz ? (
          <QuizView
            key={quiz.quizId ?? quiz.title}
            quiz={quiz}
            onNewQuiz={() => {
              setQuiz(null)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onSubmitted={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Icon name="brain" className="size-7" />
              </span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold tracking-tight text-ink">Chưa có bài kiểm tra</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Nhập nội dung hoặc tải tài liệu ở phía trên. Bài kiểm tra sẽ xuất hiện tại đây với
                  đáp án, giải thích và nút nộp bài thật.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  {['Dán ghi chú', 'Tải ảnh hoặc PDF', 'Chọn số câu', 'Nộp và xem lỗi sai'].map(
                    (step, index) => (
                      <span
                        key={step}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"
                      >
                        <span className="flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-700">
                          {index + 1}
                        </span>
                        {step}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
