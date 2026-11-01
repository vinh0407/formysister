import { expect, test } from '@playwright/test'

const publicRoutes = [
  { path: '/', heading: /Biến tài liệu của bạn thành bài kiểm tra/i },
  { path: '/history', heading: 'Lịch sử làm bài' },
  { path: '/progress', heading: 'Tiến độ học tập' },
  { path: '/materials', heading: 'Tài liệu của bạn' },
  { path: '/quizzes', heading: 'Bài kiểm tra của bạn' },
  { path: '/settings', heading: 'Cài đặt và hạn mức' },
]

for (const route of publicRoutes) {
  test(`${route.path} renders in Vietnamese with one h1`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' })

    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('html')).toHaveAttribute('lang', /^vi/)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toContainText(route.heading)
    await expect(page.getByRole('link', { name: /Bỏ qua tới nội dung chính/i })).toHaveCount(1)
  })
}

test('unknown routes render the Vietnamese not-found page', async ({ page }) => {
  const response = await page.goto('/khong-ton-tai-route-nay', { waitUntil: 'domcontentloaded' })

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Không tìm thấy trang này')
  await expect(page.getByRole('link', { name: /Về trang tổng quan/i })).toBeVisible()
})

test('the primary navigation reaches each section', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const navigation = page.getByRole('navigation', { name: 'Điều hướng chính' })
  await expect(navigation).toBeVisible()

  for (const label of ['Ôn tập', 'Tài liệu', 'Tiến độ', 'Lịch sử']) {
    await expect(navigation.getByRole('link', { name: label, exact: true })).toBeVisible()
  }
})
