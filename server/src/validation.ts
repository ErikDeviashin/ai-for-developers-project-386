export type FieldError = {
  field: string
  code: string
  message: string
}

export type ErrorResponse = {
  code: string
  message: string
  details?: FieldError[]
}

export type NewMeetingTypeInput = {
  name: string
  description?: string
  durationMinutes: number
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: ErrorResponse }

const DURATIONS = [15, 30, 60, 120]
const NAME_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 500
const BODY_FIELDS = new Set(['name', 'description', 'durationMinutes'])
const INT32_MAX = 2_147_483_647

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validationError(details: FieldError[]): ErrorResponse {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Проверьте заполнение полей',
    details,
  }
}

export function parseCreateMeetingTypeBody(body: unknown): ParseResult<NewMeetingTypeInput> {
  if (!isRecord(body)) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Тело запроса должно быть JSON-объектом',
      },
    }
  }

  const details: FieldError[] = []

  for (const field of Object.keys(body)) {
    if (!BODY_FIELDS.has(field)) {
      details.push({
        field,
        code: 'UNKNOWN_FIELD',
        message: `Неизвестное поле «${field}»`,
      })
    }
  }

  let name: string | undefined
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    details.push({
      field: 'name',
      code: 'REQUIRED',
      message: 'Укажите название типа встречи',
    })
  } else {
    name = body.name.trim()
    if (name.length > NAME_MAX_LENGTH) {
      details.push({
        field: 'name',
        code: 'TOO_LONG',
        message: `Название должно быть не длиннее ${NAME_MAX_LENGTH} символов`,
      })
    }
  }

  let description: string | undefined
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      details.push({
        field: 'description',
        code: 'INVALID_VALUE',
        message: 'Описание должно быть строкой',
      })
    } else {
      const trimmed = body.description.trim()
      if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
        details.push({
          field: 'description',
          code: 'TOO_LONG',
          message: `Описание должно быть не длиннее ${DESCRIPTION_MAX_LENGTH} символов`,
        })
      } else if (trimmed !== '') {
        description = trimmed
      }
    }
  }

  let durationMinutes: number | undefined
  if (body.durationMinutes === undefined) {
    details.push({
      field: 'durationMinutes',
      code: 'REQUIRED',
      message: 'Выберите длительность встречи',
    })
  } else if (
    typeof body.durationMinutes !== 'number' ||
    !DURATIONS.includes(body.durationMinutes)
  ) {
    details.push({
      field: 'durationMinutes',
      code: 'INVALID_DURATION',
      message: 'Длительность должна быть 15, 30, 60 или 120 минут',
    })
  } else {
    durationMinutes = body.durationMinutes
  }

  if (details.length > 0 || name === undefined || durationMinutes === undefined) {
    return { ok: false, error: validationError(details) }
  }

  return {
    ok: true,
    value: {
      name,
      ...(description === undefined ? {} : { description }),
      durationMinutes,
    },
  }
}

export function parseMeetingTypeId(raw: string | undefined): ParseResult<number> {
  if (raw === undefined || !/^\d+$/.test(raw)) {
    return { ok: false, error: invalidMeetingTypeId() }
  }

  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0 || id > INT32_MAX) {
    return { ok: false, error: invalidMeetingTypeId() }
  }

  return { ok: true, value: id }
}

function invalidMeetingTypeId(): ErrorResponse {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Проверьте параметры запроса',
    details: [
      {
        field: 'meetingTypeId',
        code: 'INVALID_VALUE',
        message: 'Идентификатор типа встречи должен быть положительным целым числом',
      },
    ],
  }
}

export function rejectQueryParameters(query: Record<string, unknown>): ErrorResponse | undefined {
  const fields = Object.keys(query)

  if (fields.length === 0) {
    return undefined
  }

  return validationError(
    fields.map((field) => ({
      field,
      code: 'UNKNOWN_QUERY_PARAMETER',
      message: `Лишний параметр запроса «${field}»`,
    })),
  )
}
