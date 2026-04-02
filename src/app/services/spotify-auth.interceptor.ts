import { HttpInterceptorFn } from '@angular/common/http';
import { SPOTIFY_API_BASE } from '../models/constants';

const SPOTIFY_TOKEN_KEY = 'spotify_access_token';

export const spotifyAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(SPOTIFY_API_BASE)) {
    return next(req);
  }

  const token: string | null = localStorage.getItem(SPOTIFY_TOKEN_KEY);
  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);
};
