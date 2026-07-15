/**
 * Demo build flag (`VITE_DEMO_MODE=1`).
 *
 * Set only on the shared Vercel deployment — never in local dev, so the real
 * onboarding flow stays testable. When on, `seedDemoData` also marks setup
 * complete, which makes `/` land on a filled dashboard instead of the wizard.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === '1';
