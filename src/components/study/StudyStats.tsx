import { Icon } from '@/components/ui/Icon'
import { formatMonth, formatNumber } from '@/lib/format'
import type { StudyStatsData } from '@/types/study'

export function StudyStats({ stats }: { stats: StudyStatsData }) {
  const maxDaily = Math.max(1, ...stats.weeklyActivity.map((day) => day.questions))
  const hasActivity = stats.totalQuizzes > 0

  return (
    <div className="space-y-6">
      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="sr-only">
          Tổng quan tiến độ
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: 'book' as const,
              value: formatNumber(stats.totalQuizzes),
              label: 'Bài đã hoàn thành',
              note: 'Tính từ lịch sử nộp bài thật',
            },
            {
              icon: 'check' as const,
              value: formatNumber(stats.totalCorrectAnswers),
              label: 'Câu trả lời đúng',
              note: `Trên ${formatNumber(stats.totalQuestions)} câu đã luyện`,
            },
            {
              icon: 'target' as const,
              value: `${stats.accuracy}%`,
              label: 'Độ chính xác trắc nghiệm',
              note: 'Tự luận không được chấm tự động',
            },
            {
              icon: 'calendar' as const,
              value: `${stats.currentStreak} ngày`,
              label: 'Chuỗi học hiện tại',
              note: `Kỷ lục ${stats.longestStreak} ngày`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={item.icon} className="size-5" />
              </span>
              <p className="mt-4 text-2xl font-bold tracking-tight text-ink">{item.value}</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="weekly-heading"
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="weekly-heading" className="text-lg font-bold tracking-tight text-ink">
              Hoạt động 7 ngày
            </h2>
            <p className="mt-1 text-sm text-slate-600">Số câu hỏi đã luyện mỗi ngày (giờ UTC).</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
            {formatNumber(stats.weeklyActivity.reduce((sum, day) => sum + day.quizzes, 0))} bài
          </span>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2" role="img" aria-label="Biểu đồ hoạt động 7 ngày">
          {stats.weeklyActivity.map((day) => {
            const height = Math.max(6, Math.round((day.questions / maxDaily) * 100))
            return (
              <div key={day.date} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">{day.questions}</span>
                <div className="flex h-32 w-full items-end rounded-lg bg-slate-50 p-1">
                  <div
                    className={`w-full rounded-md ${
                      day.questions > 0 ? 'bg-brand-500' : 'bg-slate-200'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-600">
                  {day.date.slice(8, 10)}/{day.date.slice(5, 7)}
                </span>
                <span className="sr-only">
                  {day.date}: {day.quizzes} bài, {day.questions} câu, {day.correct} câu đúng
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {!hasActivity ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-bold text-slate-800">Chưa có dữ liệu tiến độ</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Hoàn thành một bài kiểm tra để hệ thống tính độ chính xác, chuỗi ngày học và hiệu suất
            theo từng tài liệu. Không có số liệu mẫu nào được hiển thị.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section
            aria-labelledby="monthly-heading"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 id="monthly-heading" className="text-lg font-bold tracking-tight text-ink">
              Theo tháng
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-80 border-collapse text-sm">
                <caption className="sr-only">Hoạt động học tập theo tháng</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="py-2 pr-3 font-bold">
                      Tháng
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-bold">
                      Bài
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-bold">
                      Câu
                    </th>
                    <th scope="col" className="py-2 text-right font-bold">
                      Chính xác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats.monthlyActivity].reverse().map((month) => (
                    <tr key={month.month} className="border-b border-slate-100 last:border-0">
                      <th scope="row" className="py-2.5 pr-3 text-left font-semibold text-slate-700">
                        {formatMonth(month.month)}
                      </th>
                      <td className="py-2.5 pr-3 text-right text-slate-700">{month.quizzes}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-700">{month.questions}</td>
                      <td className="py-2.5 text-right font-bold text-brand-700">
                        {month.accuracy}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            aria-labelledby="subjects-heading"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 id="subjects-heading" className="text-lg font-bold tracking-tight text-ink">
              Hiệu suất theo bài
            </h2>
            {stats.materialPerformance.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Chưa đủ dữ liệu để so sánh giữa các bài kiểm tra.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {stats.materialPerformance.map((subject) => (
                  <li key={subject.title}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                        {subject.title}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-brand-700">{subject.accuracy}%</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, subject.accuracy)}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right text-[11px] font-medium text-slate-500">
                        {subject.attempts} lượt
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
