import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
export const MIN_PASSWORD_LENGTH = 4;

/** 클라이언트에서 평문 비번을 bcrypt 해시로 변환. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function isValidPassword(plain: string): boolean {
  return plain.length >= MIN_PASSWORD_LENGTH;
}
