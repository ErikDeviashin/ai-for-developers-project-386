import { expect, test } from '@playwright/test'

test('гость бронирует слот, видит созданную встречу в сессии и теряет подсветку после обновления', async ({
  page,
  request,
}) => {
  const suffix = `${Date.now()}`
  const meetingTypeName = `Знакомство ${suffix}`
  const creation = await request.post('/meeting-types', {
    data: { name: meetingTypeName, durationMinutes: 30 },
  })
  expect(creation.status()).toBe(201)

  await page.goto('/')
  await page.getByRole('link', { name: 'Записаться на звонок' }).click()
  await expect(page).toHaveURL('/book')

  const meetingTypes = page.getByRole('list', { name: 'Опубликованные типы встреч' })
  await meetingTypes.getByRole('button', { name: new RegExp(meetingTypeName) }).click()

  await page.getByRole('button', { name: 'Понедельник, 23 ноября 2026' }).click()
  await page.getByRole('button', { name: '15:00' }).click()
  await page.getByRole('button', { name: 'Далее' }).click()

  await expect(page.getByRole('heading', { name: 'Данные гостя' })).toBeVisible()
  await page.getByLabel('Имя').fill('Анна Тестова')
  await page.getByLabel('Email').fill('anna.testova@example.com')
  await page.getByLabel('Дополнительная информация').fill('Подготовьте документы')
  await page.getByRole('button', { name: 'Подтвердить' }).click()

  await expect(page).toHaveURL('/book')
  await expect(page.getByText('Встреча создана')).toBeVisible()
  await expect(page.getByText('Ваша встреча').first()).toBeVisible()
  await expect(page.getByText('anna.testova@example.com')).toHaveCount(0)
  await expect(page.getByText('Анна Тестова')).toHaveCount(0)

  await page.reload()

  await expect(page.getByText('Встреча создана')).toHaveCount(0)
  await expect(page.getByText('Ваша встреча')).toHaveCount(0)

  await meetingTypes.getByRole('button', { name: new RegExp(meetingTypeName) }).click()
  await page.getByRole('button', { name: 'Понедельник, 23 ноября 2026' }).click()
  await expect(page.getByRole('button', { name: '15:00' })).toHaveCount(0)
})
