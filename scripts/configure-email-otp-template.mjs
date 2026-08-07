#!/usr/bin/env node
/**
 * Configures Supabase Auth to email 6-digit OTP codes (not magic links only).
 *
 * Free-tier projects using Supabase's default mailer cannot edit templates.
 * Configure custom SMTP first (e.g. Resend), then this script can set OTP templates.
 *
 * Required:
 *   SUPABASE_ACCESS_TOKEN
 *
 * For free-tier OTP emails (custom SMTP unlocks templates), also set:
 *   SMTP_HOST              — default smtp.resend.com
 *   SMTP_PORT              — default 465
 *   SMTP_USER              — default resend
 *   SMTP_PASS              — Resend API key (re_...)
 *   SMTP_ADMIN_EMAIL       — verified sender, e.g. onboarding@resend.dev or your domain
 *   SMTP_SENDER_NAME       — default Gym Backend
 *
 * Optional:
 *   SUPABASE_PROJECT_REF   — defaults to igcmptpjmagzwoccxcnw
 */

const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'igcmptpjmagzwoccxcnw';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (accessToken === undefined || accessToken.trim() === '') {
  console.error('Missing required env: SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const otpBody = `<h2>Your sign-in code</h2>
<p>Enter this one-time code in the app. It expires shortly and can only be used once.</p>
<p style="font-size:24px;letter-spacing:4px;font-weight:700;">{{ .Token }}</p>
<p>If you did not request this, you can ignore this email.</p>`;

const confirmBody = `<h2>Confirm your email</h2>
<p>Enter this one-time code to verify your email and finish signing up. It expires shortly.</p>
<p style="font-size:24px;letter-spacing:4px;font-weight:700;">{{ .Token }}</p>
<p>If you did not request this, you can ignore this email.</p>`;

const smtpPass = process.env.SMTP_PASS;
const smtpAdminEmail = process.env.SMTP_ADMIN_EMAIL;
const configureSmtp =
  smtpPass !== undefined &&
  smtpPass.trim() !== '' &&
  smtpAdminEmail !== undefined &&
  smtpAdminEmail.trim() !== '';

const body = {
  // Keep length aligned with client UX / docs (project was emitting 8 digits).
  mailer_otp_length: 6,
  mailer_otp_exp: 3600,
  mailer_subjects_magic_link: 'Your sign-in code is {{ .Token }}',
  mailer_templates_magic_link_content: otpBody,
  mailer_subjects_confirmation: 'Your verification code is {{ .Token }}',
  mailer_templates_confirmation_content: confirmBody,
  // Dev-friendly Auth rate limits (custom SMTP required for email_sent > built-in).
  // otp/verify: requests per hour (project / IP buckets — see Auth rate-limits docs).
  // smtp_max_frequency: min seconds between emails to the same address.
  rate_limit_otp: 120,
  rate_limit_verify: 120,
  rate_limit_email_sent: 300,
  smtp_max_frequency: 30,
};

if (configureSmtp) {
  Object.assign(body, {
    smtp_host: process.env.SMTP_HOST ?? 'smtp.resend.com',
    smtp_port: String(process.env.SMTP_PORT ?? '465'),
    smtp_user: process.env.SMTP_USER ?? 'resend',
    smtp_pass: smtpPass,
    smtp_admin_email: smtpAdminEmail,
    smtp_sender_name: process.env.SMTP_SENDER_NAME ?? 'Gym Backend',
  });
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await response.text();
if (!response.ok) {
  console.error(`Email OTP configuration failed (${response.status})`);
  console.error(text);
  if (!configureSmtp) {
    console.error('');
    console.error('Free-tier default mailer cannot customize templates.');
    console.error('Add custom SMTP env vars, then re-run:');
    console.error('  SMTP_PASS=<resend_api_key>');
    console.error('  SMTP_ADMIN_EMAIL=onboarding@resend.dev   # or a verified domain address');
    console.error('  npm run auth:configure-email-otp');
  }
  process.exit(1);
}

const parsed = JSON.parse(text);
console.log('Email OTP configuration applied.');
console.log(`project_ref=${projectRef}`);
console.log(`smtp_configured=${configureSmtp}`);
console.log(`magic_link_subject=${parsed.mailer_subjects_magic_link ?? '(set)'}`);
console.log(`confirmation_subject=${parsed.mailer_subjects_confirmation ?? '(set)'}`);
console.log(`mailer_otp_length=${parsed.mailer_otp_length ?? '(unknown)'}`);
console.log(`rate_limit_otp=${parsed.rate_limit_otp ?? '(unknown)'}`);
console.log(`rate_limit_verify=${parsed.rate_limit_verify ?? '(unknown)'}`);
console.log(`rate_limit_email_sent=${parsed.rate_limit_email_sent ?? '(unknown)'}`);
console.log(`smtp_max_frequency=${parsed.smtp_max_frequency ?? '(unknown)'}s`);
console.log('Inbox emails will show the 6-digit {{ .Token }} for /auth/otp/verify.');
