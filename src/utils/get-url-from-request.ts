import { logger } from '../logger';

export function getUrlFromRequest(request: RequestInfo | URL): string | null {
  if (typeof request === 'string') {
    return request;
  }
  if ('href' in request) {
    return request.href;
  }
  if ('url' in request) {
    return request.url;
  }

  const _: never = request;
  logger.error('Invalid requestInfo', request);
  return null;
}
