import argon2 from "argon2";

const options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, options);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (!hash || !password) return false;
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function passwordIssues(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters";
  if (password.length > 200) return "Password is too long";
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) return "Use letters and numbers";
  return null;
}
