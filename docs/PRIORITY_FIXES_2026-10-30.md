# Complete CRM lists — 30 October 2026

Inbox, Tasks, Leads and Calls now show loaded and total record counts, with explicit Load more controls. Search, filters and ordering are applied by the backend before pagination, so older matching records remain reachable. Refreshes preserve the number of pages the operator opened. The assignment picker also searches and pages the complete unassigned list.

Deploy with the matching backend priority fixes. The backend supplies `next_cursor`, full-query counts and Calls summary statistics; it also maintains durable per-caller summaries across complete call history.

Validation: `npm run build` passes, including TypeScript and lint checks. Fourteen isolated desktop/mobile browser checks verify all four lists reach 250 records, Inbox filters use full totals, and Leads/Calls search finds a record beyond the initial page. No JavaScript exceptions or horizontal viewport overflow occurred. The mechanical UI detector reported no findings in the changed files.

To repeat the browser checks, start a production build at `http://127.0.0.1:3107`, set `CRM_REVIEW_BROWSER` to a Chromium/Chrome executable, then run `node scripts/check-crm-paging.mjs`. Optional `CRM_REVIEW_ORIGIN` and `CRM_REVIEW_OUTPUT` override the local origin and screenshot directory. The script launches its own temporary browser profile and intercepts every API request with synthetic data. It never uses the operator's browser or a real backend.

Before activating the backend, configure `RETELL_CUSTOM_LLM_SECRET` and the matching Retell socket URL token when Retell is enabled, keep Twilio signature verification configured, and use MongoDB Atlas or a replica set for transactional knowledge replacement. This commit does not change live credentials or provider settings.
