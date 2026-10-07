import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { RequestWithTraceId } from "../middleware/request-id.middleware";

interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  traceId: string;
  path: string;
  timestamp: string;
}

function getDefaultCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "BAD_REQUEST";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return "VALIDATION_ERROR";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMITED";
    default:
      return status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED";
  }
}

function normalizeHttpException(exception: HttpException): {
  status: number;
  code: string;
  message: string;
  details?: unknown;
} {
  const status = exception.getStatus();
  const payload = exception.getResponse();
if (status === HttpStatus.TOO_MANY_REQUESTS) {
  return {
    status,
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
  };
}

  if (typeof payload === "string") {
    return {
      status,
      code: getDefaultCode(status),
      message: payload,
    };
  }

  const body = payload as Record<string, unknown>;
  const rawMessage = body.message;
  const code =
    typeof body.code === "string" ? body.code : getDefaultCode(status);

  if (Array.isArray(rawMessage)) {
    return {
      status,
      code: status === HttpStatus.BAD_REQUEST ? "VALIDATION_ERROR" : code,
      message: "Request validation failed.",
      details: rawMessage,
    };
  }

  return {
    status,
    code,
    message:
      typeof rawMessage === "string" ? rawMessage : exception.message,
    details: body.details,
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithTraceId & Request>();
    const response = http.getResponse<Response>();

    const normalized =
      exception instanceof HttpException
        ? normalizeHttpException(exception)
        : {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected server error occurred.",
          };

    const body: ApiErrorResponse = {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined
        ? {}
        : { details: normalized.details }),
      traceId: request.traceId ?? "unknown",
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(normalized.status).json(body);
  }
}
