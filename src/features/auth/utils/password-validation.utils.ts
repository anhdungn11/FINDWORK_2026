export interface PasswordRuleState {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

export const getPasswordRules = (
  password: string,
): PasswordRuleState => {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
};

export const isPasswordRuleSetValid = (
  rules: PasswordRuleState,
) => {
  return Object.values(
    rules,
  ).every(Boolean);
};
