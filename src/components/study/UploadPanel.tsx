'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Icon } from '@/components/ui/Icon'
import type { GenerationPayload } from '@/hooks/useQuizGeneration'
import type { StudyMode } from '@/types/study'
import { TurnstileWidget } from './TurnstileWidget'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
const DOCUMENT_EXTENSIONS = ['pdf', 'docx', 'txt', 'md']
const MB = 1024 * 1024

function extensionOf(name: string): string {
  return name.toLowerCase().split('.').pop() ?? ''
}

function validateClientFile(file: File): string | null {
  const extension = extensionOf(file.name)
  if (['doc', 'rtf', 'odt'].includes(extension)) {
    return 'Định dạng .doc/.rtf/.odt không được hỗ trợ. Hãy lưu thành .docx, PDF hoặc TXT.'
  }
  if (!IMAGE_EXTENSIONS.includes(extension) && !DOCUMENT_EXTENSIONS.includes(extension)) {
    return 'Chỉ hỗ trợ ảnh PNG/JPG/WEBP, PDF, DOCX, TXT hoặc Markdown.'
  }
  if (file.size <= 0) return 'Tệp rỗng hoặc không đọc được.'
  const limit = IMAGE_EXTENSIONS.includes(extension)
    ? 5 * MB
    : ['txt', 'md'].includes(extension)
      ? 1 * MB
      : 10 * MB
  if (file.size > limit) {
    return `Tệp vượt quá giới hạn ${Math.round(limit / MB)} MB cho định dạng này.`
  }
  const mime = (file.type || '').toLowerCase()
  if (IMAGE_EXTENSIONS.includes(extension) && mime && !mime.startsWith('image/')) {
    return 'Tệp ảnh có kiểu nội dung không hợp lệ.'
  }
  return null
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / MB).toFixed(2)} MB`
}

export function UploadPanel({
  loading,
  stageLabel,
  error,
  quota,
  onGenerate,
  onCancel,
  onClearError,
}: {
  loading: boolean
  stageLabel: string
  error: string | null
  quota: { retryAfterSeconds?: number; code?: string } | null
  onGenerate: (payload: GenerationPayload) => Promise<unknown>
  onCancel: () => void
  onClearError: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sourceText, setSourceText] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [isCustomCount, setIsCustomCount] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [contentType, setContentType] = useState<'lesson' | 'existing-questions'>('lesson')
  const [essayCount, setEssayCount] = useState(2)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [mode, setMode] = useState<StudyMode>('learn')
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const isImage = file ? IMAGE_EXTENSIONS.includes(extensionOf(file.name)) : false
  const previewUrl = useMemo(() => {
    if (!file || !isImage) return null
    return URL.createObjectURL(file)
  }, [file, isImage])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleToken = useCallback((token: string | null) => {
    setTurnstileToken(token)
  }, [])

  const chooseFile = (candidate: File | null) => {
    if (!candidate) {
      setFile(null)
      setFileError(null)
      return
    }
    const validation = validateClientFile(candidate)
    if (validation) {
      setFile(null)
      setFileError(validation)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFile(candidate)
    setFileError(null)
  }

  const canGenerate = useMemo(
    () => Boolean(file || sourceText.trim()) && !loading,
    [file, loading, sourceText],
  )

  const submit = () => {
    if (!canGenerate) return
    if (fileError) return
    const token = turnstileToken
    // A Turnstile token is single-use: clear it and reset the widget after every
    // submit, including failures, so the next generation asks for a fresh token.
    setTurnstileToken(null)
    setResetKey((current) => current + 1)
    void onGenerate({
      file,
      sourceText,
      questionCount,
      essayCount: contentType === 'existing-questions' ? 0 : essayCount,
      mode,
      difficulty,
      contentType,
      turnstileToken: token,
    })
  }

  return (
    <section
      aria-labelledby="create-quiz-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="upload" />
        </div>
        <div>
          <h2 id="create-quiz-heading" className="text-xl font-bold tracking-tight text-ink">
            Tạo bài kiểm tra mới
          </h2>
          <p className="text-sm text-slate-600">
            Gửi nội dung như một tin nhắn hoặc đính kèm tài liệu
          </p>
        </div>
      </div>

      <div className="block">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="study-source-text"
            className="flex items-center gap-2 text-sm font-bold text-slate-700"
          >
            <Icon
              name={contentType === 'existing-questions' ? 'list' : 'book'}
              className="size-4 text-brand-600"
            />
            {contentType === 'existing-questions' ? 'Danh sách câu hỏi có sẵn' : 'Nội dung bài học'}
          </label>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setContentType('lesson')}
              aria-pressed={contentType === 'lesson'}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                contentType === 'lesson'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon name="book" className="size-3.5" />
              Tự tạo từ bài học
            </button>
            <button
              type="button"
              onClick={() => setContentType('existing-questions')}
              aria-pressed={contentType === 'existing-questions'}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                contentType === 'existing-questions'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon name="list" className="size-3.5" />
              List câu hỏi có sẵn
            </button>
          </div>
        </div>

        {contentType === 'existing-questions' ? (
          <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">
            <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-800">
              <Icon name="info" className="size-3.5" />
            </div>
            <div>
              <p className="font-bold">Chế độ giải đề tự động:</p>
              <p className="text-amber-800/90">
                Dán danh sách câu hỏi đã có (dạng: Câu 1, Câu 2... A, B, C, D). AI sẽ tự động đọc,
                giữ nguyên câu hỏi và <strong>tìm đáp án đúng kèm lời giải thích chi tiết</strong> mà
                không tạo thêm câu hỏi ngoài danh sách.
              </p>
            </div>
          </div>
        ) : null}

        <textarea
          id="study-source-text"
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          maxLength={80_000}
          placeholder={
            contentType === 'existing-questions'
              ? 'Dán danh sách câu hỏi có sẵn tại đây...\n\nVí dụ:\nCâu 1. Hội nghị Ianta diễn ra vào năm nào?\nA. 1943       B. 1944\nC. 1945       D. 1946\n\nCâu 2. Trụ sở Liên hợp quốc đặt tại đâu?\nA. Luân Đôn   B. Niu Oóc\nC. Pa-ri      D. Giơ-ne-vơ\n\n(AI sẽ nhận diện và đưa ra đáp án đúng kèm giải thích)'
              : 'Dán đoạn bài học, ghi chú hoặc nội dung ôn tập bạn muốn AI tự động tạo câu hỏi…'
          }
          className={`min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100 ${
            contentType === 'existing-questions' ? 'font-mono text-xs sm:text-sm' : 'text-sm'
          }`}
          aria-describedby="study-source-help"
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span id="study-source-help" className="text-xs font-medium text-slate-500">
            Không dán thông tin cá nhân hoặc nội dung không muốn chia sẻ.
          </span>
          <span className="shrink-0 text-xs font-medium text-slate-500">
            {sourceText.length.toLocaleString('vi-VN')}/80.000 ký tự
          </span>
        </div>
      </div>

      <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
        <span className="h-px flex-1 bg-slate-200" />
        hoặc đính kèm
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <input
        ref={inputRef}
        id="study-file-input"
        type="file"
        className="sr-only"
        accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp"
        aria-label="Chọn tệp bài học"
        onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          chooseFile(event.dataTransfer.files?.[0] ?? null)
        }}
        className={`rounded-2xl border-2 border-dashed p-4 transition ${
          dragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-brand-200 bg-brand-50/40'
        }`}
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-3 py-3 text-center transition hover:bg-white/70 sm:flex-row sm:text-left"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Local object URL preview; the custom Payload image loader cannot optimize blob URLs.
              <img
                src={previewUrl}
                alt={`Xem trước ${file?.name ?? 'tệp đã chọn'}`}
                className="mb-3 size-16 rounded-xl border border-white object-cover shadow-sm sm:mb-0 sm:mr-4"
              />
            ) : (
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm sm:mb-0 sm:mr-4">
                <Icon name={file ? 'file' : 'upload'} className="size-6" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-bold text-slate-800">
                {file ? file.name : 'Kéo thả ảnh, tài liệu hoặc chọn từ máy'}
              </span>
              <span className="mt-1 block text-xs text-slate-600">
                {file
                  ? `${formatSize(file.size)} · Nhấn để đổi tệp`
                  : 'Ảnh PNG, JPG, WEBP (5 MB) · PDF, DOCX (10 MB) · TXT (1 MB)'}
              </span>
            </span>
          </button>
          {file ? (
            <button
              type="button"
              onClick={() => {
                chooseFile(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
              className="rounded-full bg-white p-2 text-slate-600 shadow-sm transition hover:text-rose-600"
              aria-label={`Bỏ tệp ${file.name}`}
            >
              <Icon name="close" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      {fileError ? (
        <p className="mt-2 text-sm font-medium text-rose-700" role="alert">
          {fileError}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <fieldset>
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-sm font-bold text-slate-700">
              {contentType === 'existing-questions'
                ? 'Giới hạn số câu giải'
                : 'Số câu trắc nghiệm'}
            </legend>
            <span className="text-xs font-semibold text-slate-500">Tối đa 50 câu</span>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {[5, 10, 20, 50].map((count) => {
              const isActive = questionCount === count && !isCustomCount
              return (
                <button
                  type="button"
                  key={count}
                  onClick={() => {
                    setQuestionCount(count)
                    setIsCustomCount(false)
                    setCustomInput('')
                  }}
                  aria-pressed={isActive}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                    isActive
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {count}
                </button>
              )
            })}
            <div className="relative flex-1 min-w-[64px]">
              <input
                type="number"
                min={1}
                max={50}
                placeholder="Tự nhập"
                aria-label="Nhập số câu trắc nghiệm tùy chọn (1 đến 50)"
                value={isCustomCount ? customInput : ''}
                onFocus={() => {
                  setIsCustomCount(true)
                  if (!customInput) {
                    setCustomInput(String(questionCount))
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value
                  setCustomInput(val)
                  setIsCustomCount(true)
                  if (val === '') return
                  const num = parseInt(val, 10)
                  if (!isNaN(num)) {
                    const clamped = Math.min(50, Math.max(1, num))
                    setQuestionCount(clamped)
                  }
                }}
                onBlur={() => {
                  if (customInput === '' || isNaN(parseInt(customInput, 10))) {
                    setIsCustomCount(false)
                    setCustomInput('')
                    if (![5, 10, 20, 50].includes(questionCount)) {
                      setQuestionCount(10)
                    }
                  } else {
                    const num = Math.min(50, Math.max(1, parseInt(customInput, 10)))
                    setCustomInput(String(num))
                    setQuestionCount(num)
                  }
                }}
                className={`w-full rounded-lg py-1.5 px-1.5 text-center text-sm font-bold transition outline-none ${
                  isCustomCount
                    ? 'bg-white text-brand-700 shadow-sm ring-2 ring-brand-500'
                    : 'bg-transparent text-slate-600 placeholder:text-slate-400 hover:text-slate-900 hover:bg-white/50'
                }`}
                title="Nhập số câu trắc nghiệm (1 - 50)"
              />
            </div>
          </div>
        </fieldset>

        {contentType === 'lesson' ? (
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-700">Số câu tự luận</legend>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[0, 2, 5].map((count) => (
                <button
                  type="button"
                  key={count}
                  onClick={() => setEssayCount(count)}
                  aria-pressed={essayCount === count}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                    essayCount === count
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-xs">
              <Icon name="check" className="size-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">Chế độ giải danh sách câu hỏi</p>
              <p className="text-slate-500">
                AI sẽ tìm đáp án chính xác và viết lời giải chi tiết cho từng câu trong danh sách.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="study-difficulty" className="mb-2 block text-sm font-bold text-slate-700">
            Độ khó
          </label>
          <select
            id="study-difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as 'easy' | 'medium' | 'hard')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
          >
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-slate-700">Chế độ kiểm tra</legend>
          <div className="grid gap-2">
            {[
              {
                value: 'learn' as const,
                title: 'Học & sửa ngay',
                description: 'Xem đáp án sau mỗi câu',
              },
              {
                value: 'exam' as const,
                title: 'Kiểm tra thật',
                description: 'Nộp bài rồi mới xem đáp án',
              },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  mode === option.value
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="study-mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="mt-1 size-4 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">{option.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <TurnstileWidget onToken={handleToken} resetKey={resetKey} />

      {error ? (
        <div className="mt-4 space-y-2">
          <ErrorMessage id="generation-error" message={error} onDismiss={onClearError} />
          {quota ? (
            <p className="text-xs font-medium text-amber-800">
              {quota.code === 'QUOTA_EXCEEDED'
                ? 'Hạn mức AI miễn phí dùng chung đã hết. Hệ thống không tự chuyển sang mô hình trả phí.'
                : 'Giới hạn giúp bảo vệ hạn mức AI miễn phí cho tất cả học viên.'}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setResetKey((current) => current + 1)
              setTurnstileToken(null)
              onClearError()
            }}
            className="text-sm font-bold text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            Đóng lỗi và thử lại
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold text-brand-800">
              <Icon name="spinner" className="size-4 animate-spin" />
              {stageLabel || 'Đang xử lý…'}
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
            >
              Huỷ
            </button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={!canGenerate || Boolean(fileError)}
        aria-describedby={error ? 'generation-error' : undefined}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-brand-200 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon name={loading ? 'spinner' : 'spark'} className={loading ? 'size-5 animate-spin' : 'size-5'} />
        {loading
          ? 'AI đang đọc và tạo câu hỏi…'
          : file || sourceText.trim()
            ? 'Tạo bài kiểm tra với AI'
            : 'Nhập nội dung hoặc chọn tài liệu'}
      </button>
    </section>
  )
}
