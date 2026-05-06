import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { SPOTIFY_API_BASE } from '../models/constants';
import { SpotifyAuthService } from './spotify-auth.service';

const RETRY_HEADER = 'X-Spotify-Auth-Retry';

const attachToken = (req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> => {
  if (!token) {
    return req;
  }
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
};

export const spotifyAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(SPOTIFY_API_BASE)) {
    return next(req);
  }

  const authService: SpotifyAuthService = inject(SpotifyAuthService);
  const isRetry: boolean = req.headers.has(RETRY_HEADER);
  const authedReq: HttpRequest<unknown> = attachToken(req, authService.getAccessToken());

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      const status: number = err instanceof HttpErrorResponse ? err.status : 0;
      if (status !== 401 || isRetry || !authService.hasRefreshToken()) {
        return throwError(() => err);
      }

      // Attempt a single token refresh and retry the original request once.
      return from(authService.refreshToken()).pipe(
        switchMap((ok: boolean) => {
          if (!ok) {
            return throwError(() => err);
          }
          const retryReq: HttpRequest<unknown> = attachToken(
            req.clone({ setHeaders: { [RETRY_HEADER]: '1' } }),
            authService.getAccessToken(),
          );
          return next(retryReq);
        }),
      );
    }),
  );
};
