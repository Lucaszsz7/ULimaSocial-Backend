const buckets = new Map();

export const createRateLimiter = ({ windowMs, max }) => (req, res, next) => {
  const now = Date.now();
  const key = `${req.ip}:${req.baseUrl}${req.path}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }
  if (bucket.count >= max) {
    res.set('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({ message: 'Demasiados intentos. Intenta nuevamente más tarde.' });
  }
  bucket.count += 1;
  next();
};
