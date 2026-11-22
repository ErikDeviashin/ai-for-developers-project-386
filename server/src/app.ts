import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import type { DatabaseSync } from 'node:sqlite'
import { createMeetingType, listMeetingTypes } from './meeting-types.js'
import { parseCreateMeetingTypeBody, rejectQueryParameters } from './validation.js'

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

  return app
}
