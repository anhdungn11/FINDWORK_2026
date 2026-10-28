import { SetMetadata } from "@nestjs/common";
import type { PlatformCapabilityCode } from "../platform-capabilities";

export const REQUIRED_PLATFORM_CAPABILITY_KEY = "authorization:platform-capability";
export const RequirePlatformCapability = (code: PlatformCapabilityCode): MethodDecorator =>
  SetMetadata(REQUIRED_PLATFORM_CAPABILITY_KEY, code);
