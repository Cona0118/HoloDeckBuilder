import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
export const MIN_PASSWORD_LENGTH = 4;

/** 클라이언트에서 평문 비번을 bcrypt 해시로 변환. */
export async function hashPassword(plain: string): Promise<string> {
  const hash = await bcrypt.hash(plain, SALT_ROUNDS);
  // pgcrypto crypt()는 $2a$ 프리픽스만 인식하므로 bcryptjs 3.x가 기본 생성하는
  // $2b$/$2y$를 $2a$로 치환한다. 표준 ASCII 비번에선 알고리즘이 동일.
  return hash.replace(/^\$2[by]\$/, '$2a$');
}

export function isValidPassword(plain: string): boolean {
  return plain.length >= MIN_PASSWORD_LENGTH;
}
