/**
 * Barrel export do modulo de email transacional.
 *
 * Uso tipico:
 *   import { sendEmail, welcomeEmail } from "@/lib/email";
 *   const { subject, html, text } = welcomeEmail({ name, loginUrl });
 *   await sendEmail({ to: user.email, subject, html, text });
 */
export { sendEmail } from "./client";
export type { SendEmailInput, SendEmailResult } from "./client";

export { welcomeEmail } from "./templates/welcome";
export type { WelcomeEmailInput, EmailContent } from "./templates/welcome";

export { passwordResetEmail } from "./templates/password-reset";
export type { PasswordResetEmailInput } from "./templates/password-reset";

export { alertTriggeredEmail } from "./templates/alert-triggered";
export type { AlertTriggeredEmailInput, AlertType } from "./templates/alert-triggered";

export { survivalAlertEmail } from "./templates/survival-alert";
export type { SurvivalAlertEmailInput, SurvivalAlertKind } from "./templates/survival-alert";

export { paymentConfirmedEmail } from "./templates/payment-confirmed";
export type { PaymentConfirmedEmailInput } from "./templates/payment-confirmed";

export { subscriptionCanceledEmail } from "./templates/subscription-canceled";
export type { SubscriptionCanceledEmailInput } from "./templates/subscription-canceled";
