import { neonAuth } from "@/lib/neon-auth-server";

export const { GET, POST, PUT, DELETE, PATCH } = neonAuth.handler();
