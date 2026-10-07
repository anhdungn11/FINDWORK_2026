import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export interface RequestWithTraceId extends Request {
  traceId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    request: RequestWithTraceId,
    response: Response,
    next: NextFunction,
  ): void {
    const incomingRequestId = request.header("x-request-id")?.trim();
    const traceId = incomingRequestId || randomUUID();

    request.traceId = traceId;
    response.setHeader("x-request-id", traceId);

    next();
  }
}
