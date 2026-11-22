import "@typespec/http";
import "@typespec/openapi";

using Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Calendar API" })
namespace CalendarApi;

model HealthResponse {
  status: "ok";
}

model FieldError {
  field: string;
  code: string;
  message: string;
}

model ErrorResponse {
  code: string;
  message: string;
  details?: FieldError[];
}

@error
model BadRequestResponse {
  @statusCode _: 400;
  @body body: ErrorResponse;
}

@error
model NotFoundResponse {
  @statusCode _: 404;
  @body body: ErrorResponse;
}

model MeetingType {
  id: int32;
  name: string;
  description?: string;
  durationMinutes: int32;
}

model CreateMeetingTypeRequest {
  name: string;
  description?: string;
  durationMinutes: int32;
}

model MeetingTypeCreated {
  @statusCode _: 201;
  @body body: MeetingType;
}

model Slot {
  start: offsetDateTime;
  end: offsetDateTime;
}

model AvailabilityDay {
  date: plainDate;
  slots: Slot[];
}

model MeetingTypeAvailability {
  days: AvailabilityDay[];
}

@route("/health")
@get
@operationId("getHealth")
op getHealth(): HealthResponse;

@route("/meeting-types")
@get
@operationId("listMeetingTypes")
op listMeetingTypes(): MeetingType[] | BadRequestResponse;

@route("/meeting-types")
@post
@operationId("createMeetingType")
op createMeetingType(
  @body body: CreateMeetingTypeRequest,
): MeetingTypeCreated | BadRequestResponse;

@route("/meeting-types/{meetingTypeId}/availability")
@get
@operationId("getMeetingTypeAvailability")
op getMeetingTypeAvailability(
  @path meetingTypeId: int32,
): MeetingTypeAvailability | BadRequestResponse | NotFoundResponse;
