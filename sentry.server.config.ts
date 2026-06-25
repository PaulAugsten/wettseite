import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    // Spans for Server Actions, route handlers, SSR — this is the OpenTelemetry data,
    // Sentry's SDK runs an OTEL pipeline under the hood and reports through here.
    debug: false,
});
