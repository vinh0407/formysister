import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { QuizView } from '@/components/study/QuizView'
import { Icon } from '@/components/ui/Icon'
import { loadQuizForView } from '@/lib/study/server-data'
import type { StudyMode } from '@/types/study'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Làm bài kiểm tra',
  description: 'Học và sửa lỗi ngay hoặc làm bài kiểm tra thật với đáp án ẩn tới khi nộp.',
}

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const mode: StudyMode = query.mode === 'learn' ? 'learn' : 'exam'
  const loaded = await loadQuizForView(id, mode)
  if (!loaded) notFound()

  const { quiz, owned } = loaded

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-5">
        <Link
          href="/quizzes"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:text-brand-800"
        >
          <Icon name="arrowLeft" className="size-4" />
          Bài kiểm tra của bạn
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Chế độ làm bài</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {owned
              ? 'Bạn có thể chuyển giữa học và thi. Đáp án được máy chủ lọc theo chế độ.'
              : 'Bài kiểm tra công khai luôn chạy ở chế độ thi để bảo vệ đáp án.'}
          </p>
        </div>
        {owned ? (
          <div className="flex shrink-0 gap-2" role="group" aria-label="Chọn chế độ làm bài">
            <Link
              href={`/quizzes/${id}?mode=learn`}
              aria-current={quiz.mode === 'learn' ? 'page' : undefined}
              className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                quiz.mode === 'learn'
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300'
              }`}
            >
              Học & sửa ngay
            </Link>
            <Link
              href={`/quizzes/${id}?mode=exam`}
              aria-current={quiz.mode === 'exam' ? 'page' : undefined}
              className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                quiz.mode === 'exam'
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300'
              }`}
            >
              Thi thật
            </Link>
          </div>
        ) : null}
      </div>

      <QuizView key={`${id}-${quiz.mode}`} quiz={quiz} />
    </main>
  )
}
