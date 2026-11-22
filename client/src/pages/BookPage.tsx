import { useEffect, useState } from 'react'
import {
  getMeetingTypeAvailability,
  listMeetingTypes,
  type AvailabilityDay,
  type MeetingType,
  type MeetingTypeAvailability,
} from '../api/generated'
import { toErrorResponse } from '../api/errors'
import { PageContainer } from '../components/PageContainer'
import { PageHeading } from '../components/PageHeading'
import {
  WEEKDAY_LABELS,
  buildCalendarWeeks,
  formatLongDate,
  formatMonthTitle,
  formatSlotTime,
} from '../lib/calendar'
import { formatDuration, sortMeetingTypes } from '../lib/meetingTypes'

type Step = 'type' | 'datetime' | 'guest'

type CalendarProps = {
  firstDate: string
  daysByDate: Map<string, AvailabilityDay>
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

function AvailabilityCalendar({
  firstDate,
  daysByDate,
  selectedDate,
  onSelectDate,
}: CalendarProps) {
  const weeks = buildCalendarWeeks(firstDate)

  return (
    <div className="mt-6">
      <h3 id="calendar-heading" className="text-xl font-semibold">
        {formatMonthTitle(firstDate)}
      </h3>
      <table aria-labelledby="calendar-heading" className="mt-3 w-full table-fixed border-collapse">
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((label) => (
              <th key={label} scope="col" className="pb-2 text-sm font-medium text-slate-500">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.date}>
              {week.map((day) => {
                const availabilityDay = daysByDate.get(day.date)
                const isEnabled = availabilityDay !== undefined && availabilityDay.slots.length > 0
                const isSelected = selectedDate === day.date
                const className = [
                  'w-full rounded-lg border px-1 py-2 text-center transition-colors',
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : isEnabled
                      ? 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                      : 'cursor-not-allowed border-transparent bg-slate-50 text-slate-300',
                ].join(' ')

                return (
                  <td key={day.date} className="p-1">
                    <button
                      type="button"
                      disabled={!isEnabled}
                      aria-label={formatLongDate(day.date)}
                      aria-pressed={isSelected}
                      onClick={() => onSelectDate(day.date)}
                      className={className}
                    >
                      <span className="block text-base font-medium">{day.dayOfMonth}</span>
                      {day.inTitleMonth ? null : (
                        <span className="block text-[11px] leading-tight">{day.monthLabel}</span>
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BookPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null)

  const [availability, setAvailability] = useState<MeetingTypeAvailability | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

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

  const meetingTypeId = selectedType?.id

  useEffect(() => {
    if (meetingTypeId === undefined) {
      return
    }

    let active = true

    getMeetingTypeAvailability({ path: { meetingTypeId }, throwOnError: true })
      .then(({ data }) => {
        if (active) {
          setAvailability(data ?? { days: [] })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAvailabilityError(
            toErrorResponse(error)?.message ??
              'Не удалось загрузить доступное время. Попробуйте ещё раз.',
          )
        }
      })

    return () => {
      active = false
    }
  }, [meetingTypeId, reloadKey])

  function handleTypeSelect(meetingType: MeetingType) {
    const isSameType = selectedType?.id === meetingType.id

    setNotice(null)
    setCheckError(null)
    setAvailability(null)
    setAvailabilityError(null)

    if (!isSameType) {
      setSelectedDate(null)
      setSelectedSlot(null)
    }

    setSelectedType(meetingType)
    setStep('datetime')
    setReloadKey((current) => current + 1)
  }

  function retryAvailability() {
    setAvailability(null)
    setAvailabilityError(null)
    setReloadKey((current) => current + 1)
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setSelectedSlot(null)
    setNotice(null)
    setCheckError(null)
  }

  function handleSlotSelect(slotStart: string) {
    setSelectedSlot(slotStart)
    setNotice(null)
    setCheckError(null)
  }

  function handleBackToTypes() {
    setNotice(null)
    setCheckError(null)
    setStep('type')
  }

  async function handleNext() {
    if (selectedType === null || selectedDate === null || selectedSlot === null) {
      return
    }

    setChecking(true)
    setNotice(null)
    setCheckError(null)

    try {
      const { data } = await getMeetingTypeAvailability({
        path: { meetingTypeId: selectedType.id },
        throwOnError: true,
      })
      const freshAvailability = data ?? { days: [] }
      setAvailability(freshAvailability)

      const freshDay = freshAvailability.days.find((day) => day.date === selectedDate)
      const isStillFree = freshDay?.slots.some((slot) => slot.start === selectedSlot) ?? false

      if (!isStillFree) {
        setSelectedSlot(null)
        setNotice(
          freshDay === undefined || freshDay.slots.length === 0
            ? 'На эту дату нет свободного времени'
            : 'Этот слот уже заняли, выберите другое время',
        )
        return
      }

      setStep('guest')
    } catch (error: unknown) {
      setCheckError(
        toErrorResponse(error)?.message ?? 'Не удалось проверить доступность. Попробуйте ещё раз.',
      )
    } finally {
      setChecking(false)
    }
  }

  const daysByDate = new Map((availability?.days ?? []).map((day) => [day.date, day]))
  const selectedDay = selectedDate === null ? undefined : daysByDate.get(selectedDate)
  const hasAnySlot = (availability?.days ?? []).some((day) => day.slots.length > 0)
  const availabilityLoading = availability === null && availabilityError === null

  return (
    <PageContainer>
      <PageHeading title="Запись на звонок" />

      <div className="mt-6">
        {step === 'type' ? (
          listError ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
              {listError}
            </p>
          ) : meetingTypes === null ? (
            <p className="text-slate-600">Загрузка типов встреч…</p>
          ) : meetingTypes.length === 0 ? (
            <p className="text-slate-600">Пока нет опубликованных типов встреч</p>
          ) : (
            <ul aria-label="Опубликованные типы встреч" className="space-y-3">
              {meetingTypes.map((meetingType) => {
                const isSelected = selectedType?.id === meetingType.id

                return (
                  <li key={meetingType.id} className="rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleTypeSelect(meetingType)}
                      className={[
                        'w-full rounded-xl p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
                        isSelected ? 'bg-slate-100' : 'hover:bg-slate-50',
                      ].join(' ')}
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
                )
              })}
            </ul>
          )
        ) : step === 'datetime' && selectedType !== null ? (
          <section
            aria-labelledby="next-step-heading"
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 id="next-step-heading" className="text-2xl font-semibold">
              Выбор даты и времени
            </h2>

            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Календарь звонков
              </p>
              <p className="mt-1 text-lg font-medium">
                {selectedType.name} · {formatDuration(selectedType.durationMinutes)}
              </p>
              {selectedDate ? (
                <p className="mt-1 text-slate-700">
                  {formatLongDate(selectedDate)}
                  {selectedSlot ? `, ${formatSlotTime(selectedSlot)}` : ''}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-slate-600">Время по Тбилиси (UTC+4)</p>
            </div>

            {availabilityError ? (
              <div role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-red-800">
                <p>{availabilityError}</p>
                <button
                  type="button"
                  onClick={retryAvailability}
                  className="mt-2 font-medium underline underline-offset-4"
                >
                  Повторить
                </button>
              </div>
            ) : availabilityLoading ? (
              <p className="mt-6 text-slate-600">Загрузка доступного времени…</p>
            ) : availability === null ? null : (
              <>
                <AvailabilityCalendar
                  firstDate={availability.days[0]?.date ?? ''}
                  daysByDate={daysByDate}
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                />

                <div className="mt-8 rounded-xl border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold">
                    {selectedDate === null
                      ? `Время · ${selectedType.name}`
                      : `${formatLongDate(selectedDate)} · ${selectedType.name}`}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">Время по Тбилиси (UTC+4)</p>

                  {notice ? (
                    <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-amber-900">
                      {notice}
                    </p>
                  ) : null}

                  {checkError ? (
                    <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">
                      <p>{checkError}</p>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="mt-2 font-medium underline underline-offset-4"
                      >
                        Повторить
                      </button>
                    </div>
                  ) : null}

                  {selectedDate === null ? (
                    hasAnySlot ? (
                      <p className="mt-4 text-slate-600">Пожалуйста, выберите свободную дату</p>
                    ) : (
                      <p className="mt-4 text-slate-600">
                        В ближайшие 14 дней нет свободного времени
                      </p>
                    )
                  ) : selectedDay !== undefined && selectedDay.slots.length > 0 ? (
                    <fieldset className="mt-4 min-w-0 border-0 p-0">
                      <legend className="sr-only">Свободные слоты</legend>
                      <div className="flex flex-wrap gap-2">
                        {selectedDay.slots.map((slot) => {
                          const isSelected = selectedSlot === slot.start

                          return (
                            <button
                              key={slot.start}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => handleSlotSelect(slot.start)}
                              className={[
                                'rounded-lg border px-4 py-2 font-medium transition-colors',
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
                              ].join(' ')}
                            >
                              {formatSlotTime(slot.start)}
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>
                  ) : notice === null ? (
                    <p className="mt-4 text-slate-600">На эту дату нет свободного времени</p>
                  ) : null}
                </div>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBackToTypes}
                className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-900 transition-colors hover:bg-slate-50"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={selectedSlot === null || checking}
                onClick={handleNext}
                className="rounded-lg bg-slate-900 px-5 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checking ? 'Проверяем…' : 'Далее'}
              </button>
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="guest-step-heading"
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 id="guest-step-heading" className="text-2xl font-semibold">
              Данные гостя
            </h2>
            <p className="mt-2 text-slate-600">
              Скоро здесь можно будет указать имя, email и дополнительную информацию.
            </p>
            <button
              type="button"
              onClick={() => setStep('datetime')}
              className="mt-6 rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              Назад
            </button>
          </section>
        )}
      </div>
    </PageContainer>
  )
}
