export async function fetchAuthStatus() {
  return { authenticated: false };
}

export async function checkIsFirstUser() {
  return false;
}

export async function login(username: string, password: string) {
  if (username === "rohitgirishbelagali@gmail.com" && password === "SP@ssw0rd!") {
    return { ok: true };
  }
  return { ok: false, error: "Invalid credentials" };
}
