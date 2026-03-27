import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        let player = await prisma.player.findUnique({
          where: { userId: user.id },
        });

        if (!player) {
          player = await prisma.player.create({
            data: { userId: user.id },
          });
        }

        session.user.playerId = player.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
