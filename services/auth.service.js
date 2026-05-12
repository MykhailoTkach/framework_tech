import argon2 from "argon2";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export function createAuthService({ db }) {
  return {
    async register({ email, password }) {
      const hash = await argon2.hash(password);
      const [result] = await db.insert(users).values({ email, password: hash });
      return { id: result.insertId, email };
    },

    async login({ email, password }) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      if (!user) return null;
      const valid = await argon2.verify(user.password, password);
      if (!valid) return null;
      return { id: user.id, email: user.email };
    },
  };
}
