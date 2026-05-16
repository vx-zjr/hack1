export const VALID_USERNAME = '}Ne2@rs=tC';
export const VALID_PASSWORD = 'i32+.NfiqrPQ?_';

export type AuthResult =
  | { ok: true }
  | { ok: false; field?: 'username' | 'password'; message: string };

export function validateCredentials(username: string, password: string): AuthResult {
  if (!username.trim()) return { ok: false, field: 'username', message: '请输入用户名' };
  if (!password) return { ok: false, field: 'password', message: '请输入密码' };
  if (username === VALID_USERNAME && password === VALID_PASSWORD) return { ok: true };
  return { ok: false, message: '输入错误，请联系管理员' };
}
