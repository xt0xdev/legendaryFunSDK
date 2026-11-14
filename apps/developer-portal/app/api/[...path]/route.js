import { handleDeveloperApi } from '../../../lib/developer-api.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request) {
  return handleDeveloperApi(request);
}

export function POST(request) {
  return handleDeveloperApi(request);
}

export function OPTIONS(request) {
  return handleDeveloperApi(request);
}
