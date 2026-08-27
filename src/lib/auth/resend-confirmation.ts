export const RESEND_CONFIRMATION_SUCCESS_MESSAGE =
  "If this email is awaiting confirmation, a new confirmation link will arrive shortly.";

export const RESEND_CONFIRMATION_RATE_LIMIT_MESSAGE =
  "Please wait a moment before requesting another email.";

type ResendConfirmationOutcome =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function getResendConfirmationOutcome(
  errorCode?: string | null,
): ResendConfirmationOutcome {
  if (errorCode === "over_email_send_rate_limit") {
    return {
      kind: "error",
      message: RESEND_CONFIRMATION_RATE_LIMIT_MESSAGE,
    };
  }

  return {
    kind: "success",
    message: RESEND_CONFIRMATION_SUCCESS_MESSAGE,
  };
}
