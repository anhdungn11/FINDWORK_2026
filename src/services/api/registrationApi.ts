import { apiClient } from "../http/apiClient";
import { parseAuthResponse, type AuthSessionResponse } from "../http/authResponse";
import { API_ENDPOINTS } from "../http/endpoints";
import type { RegistrationIntent } from "../../features/auth/types/accountType";

export interface RegistrationPayload {
  email: string;
  password: string;
  accountType: RegistrationIntent;
}

export async function registerAccount(payload: RegistrationPayload): Promise<AuthSessionResponse> {
  const response = await apiClient.post<unknown>(API_ENDPOINTS.AUTH.REGISTER_V2, payload);
  const session = parseAuthResponse(response.data);
  if (session.user.accountType !== payload.accountType) {
    throw new Error("Registration response account type did not match the selected account type.");
  }
  return session;
}
