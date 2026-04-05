import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
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
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;
        const ok = await verifyPassword(passwordRaw, user.password);
        if (!ok) return null;
        if (!user.emailVerified) {
          throw new EmailNotVerified();
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
