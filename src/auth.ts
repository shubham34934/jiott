import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}

class UserNotFound extends CredentialsSignin {
  code = "user_not_found";
}

const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  (process.env.NODE_ENV === "development"
    ? "dev-only-auth-secret-min-32-chars-required!!"
    : undefined);

const authConfig = {
  trustHost: true,
  secret: authSecret,
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email;
        const passwordRaw = credentials?.password;
        if (
          typeof emailRaw !== "string" ||
          typeof passwordRaw !== "string" ||
          !emailRaw.trim() ||
          !passwordRaw
        ) {
          return null;
        }
        const email = emailRaw.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          include: { player: { select: { id: true } } },
        });
        if (!user?.password) {
          throw new UserNotFound();
        }
        const ok = await verifyPassword(passwordRaw, user.password);
        if (!ok) return null;
        if (!user.emailVerified) {
          throw new EmailNotVerified();
        }
        let playerId = user.player?.id;
        if (!playerId) {
          const created = await prisma.player.create({
            data: { userId: user.id },
            select: { id: true },
          });
          playerId = created.id;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          playerId,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (user?.playerId) token.playerId = user.playerId;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        if (typeof token.playerId === "string") {
          session.user.playerId = token.playerId;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
