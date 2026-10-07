import {
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../guards/access-token.guard";

export const CurrentAuth = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ) => {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.auth;
  },
);