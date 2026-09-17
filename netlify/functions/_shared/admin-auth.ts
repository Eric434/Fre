export function isAuthorizedAdmin(req: Request): boolean {
  const token = req.headers.get("x-admin-token");
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  return Boolean(token) && Boolean(expected) && token === expected;
}
