export interface User {
  id: string;
  name: string;
  email: string;
  accessToken: string;
}

export interface DecodedToken {
  id: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}
