import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createMeetingType,
  listMeetingTypes,
  type CreateMeetingTypeRequest,
  type MeetingType,
} from '../api/generated'
import { fieldErrorsFrom, toErrorResponse } from '../api/errors'
import { PageContainer } from '../components/PageContainer'
import { PageHeading } from '../components/PageHeading'

const DURATIONS = [15, 30, 60, 120]

function sortMeetingTypes(meetingTypes: MeetingType[]): MeetingType[] {
  return [...meetingTypes].sort(
    (left, right) =>
      left.durationMinutes - right.durationMinutes || left.name.localeCompare(right.name, 'ru'),
  )
}

function formatDuration(durationMinutes: number): string {
  return `${durationMinutes} минут`
}

export function OwnerPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    listMeetingTypes()
      .then(({ data }) => {
        if (active) {
          setMeetingTypes(sortMeetingTypes(data ?? []))
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setListError(
            toErrorResponse(error)?.message ??
              'Не удалось загрузить типы встреч. Обновите страницу.',
          )
        }
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)
    setSuccessMessage(null)

    const body: CreateMeetingTypeRequest = {
      name,
      ...(description.trim() === '' ? {} : { description }),
      durationMinutes: duration === '' ? 0 : Number(duration),
    }

    try {
      const { data } = await createMeetingType({ body })

      if (!data) {
        setFormError('Не удалось создать тип встречи. Попробуйте ещё раз.')
        return
      }

      setName('')
      setDescription('')
      setDuration('')
      setMeetingTypes((current) => sortMeetingTypes([...(current ?? []), data]))
      setSuccessMessage('Тип встречи создан')
    } catch (error: unknown) {
      const response = toErrorResponse(error)

      if (response?.details?.length) {
        setFieldErrors(fieldErrorsFrom(response))
      } else {
        setFormError(response?.message ?? 'Не удалось создать тип встречи. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer>
      <PageHeading title="Страница владельца" />

      <div className="mt-4">
        <Link
          to="/book"
          className="font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
        >
          К странице записи
        </Link>
      </div>

      <section aria-labelledby="meeting-types-heading" className="mt-10">
        <h2 id="meeting-types-heading" className="text-2xl font-semibold">
          Типы встреч
        </h2>

        <form
          noValidate
          onSubmit={handleSubmit}
          aria-labelledby="meeting-types-heading"
          className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <div>
            <label htmlFor="meeting-type-name" className="block font-medium">
              Название
            </label>
            <input
              id="meeting-type-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? 'meeting-type-name-error' : undefined}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            {fieldErrors.name ? (
              <p id="meeting-type-name-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="meeting-type-description" className="block font-medium">
              Описание
            </label>
            <textarea
              id="meeting-type-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={
                fieldErrors.description ? 'meeting-type-description-error' : undefined
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              rows={3}
            />
            {fieldErrors.description ? (
              <p id="meeting-type-description-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.description}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="meeting-type-duration" className="block font-medium">
              Длительность
            </label>
            <select
              id="meeting-type-duration"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              aria-invalid={fieldErrors.durationMinutes ? true : undefined}
              aria-describedby={
                fieldErrors.durationMinutes ? 'meeting-type-duration-error' : undefined
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Выберите длительность</option>
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatDuration(minutes)}
                </option>
              ))}
            </select>
            {fieldErrors.durationMinutes ? (
              <p id="meeting-type-duration-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.durationMinutes}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
              {formError}
            </p>
          ) : null}

          {successMessage ? (
            <output className="block rounded-lg bg-green-50 p-3 text-green-800">
              {successMessage}
            </output>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex rounded-lg bg-slate-900 px-5 py-3 font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Создать тип встречи
          </button>
        </form>

        <div className="mt-6">
          {listError ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
              {listError}
            </p>
          ) : meetingTypes === null ? (
            <p className="text-slate-600">Загрузка типов встреч…</p>
          ) : meetingTypes.length === 0 ? (
            <p className="text-slate-600">Типов встреч пока нет. Создайте первый</p>
          ) : (
            <ul aria-label="Опубликованные типы встреч" className="space-y-3">
              {meetingTypes.map((meetingType) => (
                <li
                  key={meetingType.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-medium">{meetingType.name}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {formatDuration(meetingType.durationMinutes)}
                    </span>
                  </div>
                  {meetingType.description ? (
                    <p className="mt-2 text-slate-600">{meetingType.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="meetings-heading" className="mt-10">
        <h2 id="meetings-heading" className="text-2xl font-semibold">
          Встречи
        </h2>
        <p className="mt-4 text-slate-600">Пока нет встреч</p>
      </section>
    </PageContainer>
  )
}
