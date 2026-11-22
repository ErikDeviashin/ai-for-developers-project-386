import { useEffect, useState } from 'react'
import { listMeetingTypes, type MeetingType } from '../api/generated'
import { toErrorResponse } from '../api/errors'
import { PageContainer } from '../components/PageContainer'
import { PageHeading } from '../components/PageHeading'
import { formatDuration, sortMeetingTypes } from '../lib/meetingTypes'

export function BookPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null)

  useEffect(() => {
    let active = true

    listMeetingTypes({ throwOnError: true })
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

  return (
    <PageContainer>
      <PageHeading title="Запись на звонок" />

      <div className="mt-6">
        {selectedType ? (
          <section
            aria-labelledby="next-step-heading"
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 id="next-step-heading" className="text-2xl font-semibold">
              Выбор даты и времени
            </h2>
            <p className="mt-2 text-slate-600">Скоро здесь можно будет выбрать дату и время.</p>
            <p className="mt-4 text-slate-700">
              Выбранный тип встречи: <span className="font-medium">{selectedType.name}</span>
            </p>
          </section>
        ) : listError ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
            {listError}
          </p>
        ) : meetingTypes === null ? (
          <p className="text-slate-600">Загрузка типов встреч…</p>
        ) : meetingTypes.length === 0 ? (
          <p className="text-slate-600">Пока нет опубликованных типов встреч</p>
        ) : (
          <ul aria-label="Опубликованные типы встреч" className="space-y-3">
            {meetingTypes.map((meetingType) => (
              <li key={meetingType.id} className="rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setSelectedType(meetingType)}
                  className="w-full p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-lg font-medium">{meetingType.name}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {formatDuration(meetingType.durationMinutes)}
                    </span>
                  </span>
                  {meetingType.description ? (
                    <span className="mt-2 block text-slate-600">{meetingType.description}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  )
}
