import * as Sentry from '@sentry/nextjs';
import { getSharedSentryOptions } from './lib/sentry/options';

Sentry.init({
	...getSharedSentryOptions()
});
