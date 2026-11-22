import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import type { DatabaseSync } from 'node:sqlite'
import { getMeetingTypeAvailability } from './availability.js'
import { createMeetingType, findMeetingType, listMeetingTypes } from './meeting-types.js'
import { createMeeting } from './meetings.js'
import {
  parseCreateMeetingBody,
  parseCreateMeetingTypeBody,
  parseMeetingTypeId,
  rejectQueryParameters,
  validateBookingStart,
} from './validation.js'

type BuildAppOptions = {
  db: DatabaseSync
  logger?: boolean
  now?: () => Date
}

declare module 'fastify' {
  interface FastifyInstance {
    now: () => Date
  }
}

export function buildApp({
  db,
  logger = false,
  now = () => new Date(),
}: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger })
  app.decorate('now', now)

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
      reply.code(400)
      return reply.send({
        code: 'VALIDATION_ERROR',
        message: 'Тело запроса содержит некорректный JSON',
      })
    }

    reply.code(500)
    return reply.send({
      code: 'INTERNAL_ERROR',
      message: 'Внутренняя ошибка сервера',
    })
  })

  app.get('/health', async () => ({ status: 'ok' }))

  app.get('/meeting-types', async (request, reply) => {
    const queryError = rejectQueryParameters(request.query as Record<string, unknown>)
    if (queryError) {
      reply.code(400)
      return queryError
    }

    return listMeetingTypes(db)
  })

  app.get('/meeting-types/:meetingTypeId/availability', async (request, reply) => {
    const queryError = rejectQueryParameters(request.query as Record<string, unknown>)
    if (queryError) {
      reply.code(400)
      return queryError
    }

    const params = request.params as { meetingTypeId?: string }
    const parsedId = parseMeetingTypeId(params.meetingTypeId)
    if (!parsedId.ok) {
      reply.code(400)
      return parsedId.error
    }

    const meetingType = findMeetingType(db, parsedId.value)
    if (meetingType === undefined) {
      reply.code(404)
      return {
        code: 'MEETING_TYPE_NOT_FOUND',
        message: 'Тип встречи не найден',
      }
    }

    return getMeetingTypeAvailability(db, meetingType, app.now())
  })

  app.post('/meeting-types', async (request, reply) => {
    const queryError = rejectQueryParameters(request.query as Record<string, unknown>)
    if (queryError) {
      reply.code(400)
      return queryError
    }

    const parsed = parseCreateMeetingTypeBody(request.body)
    if (!parsed.ok) {
      reply.code(400)
      return parsed.error
    }

    reply.code(201)
    return createMeetingType(db, parsed.value)
  })

  app.post('/meetings', async (request, reply) => {
    const queryError = rejectQueryParameters(request.query as Record<string, unknown>)
    if (queryError) {
      reply.code(400)
      return queryError
    }

    const parsed = parseCreateMeetingBody(request.body)
    if (!parsed.ok) {
      reply.code(400)
      return parsed.error
    }

    const meetingType = findMeetingType(db, parsed.value.meetingTypeId)
    if (meetingType === undefined) {
      reply.code(404)
      return {
        code: 'MEETING_TYPE_NOT_FOUND',
        message: 'Тип встречи не найден',
      }
    }

    const startError = validateBookingStart(
      parsed.value.startMs,
      meetingType.durationMinutes,
      app.now(),
    )
    if (startError) {
      reply.code(400)
      return startError
    }

    const result = createMeeting(db, meetingType, {
      startMs: parsed.value.startMs,
      endMs: parsed.value.startMs + meetingType.durationMinutes * 60_000,
      guestName: parsed.value.guestName,
      guestEmail: parsed.value.guestEmail,
      ...(parsed.value.guestAdditionalInfo === undefined
        ? {}
        : { guestAdditionalInfo: parsed.value.guestAdditionalInfo }),
    })

    if (!result.ok) {
      reply.code(409)
      return {
        code: 'SLOT_TAKEN',
        message: 'Это время уже занято, выберите другое',
      }
    }

    reply.code(201)
    return result.meeting
  })

  return app
}
