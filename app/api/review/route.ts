/**
 * POST /api/review — fail-closed private multi-agent code review. Logic and zero-retention notes live in
 * lib/review/handler.ts. ZERO RETENTION: code is held in request memory only, never logged, stored or echoed.
 */
import { handleReview } from "@/lib/review/handler";

// Node.js runtime is the default (Cache Components forbids the `runtime` export).
// Three sequential rounds of model calls; Vercel functions allow up to 300 s.
export const maxDuration = 300;

export function POST(request: Request): Promise<Response> {
  return handleReview(request);
}
