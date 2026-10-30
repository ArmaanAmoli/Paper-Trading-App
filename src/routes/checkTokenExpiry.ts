interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
    return (payload.exp ?? 0) * 1000 < Date.now();
  } catch {
    return true;
  }
};

export default isTokenExpired;
