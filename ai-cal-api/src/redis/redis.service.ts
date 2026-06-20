// redis.service.ts
import { redis } from "./redis";

const PREFIX = "pending:";

export const setPending = async (userId: string, data: any) => {
  await redis.set(
    PREFIX + userId,
    JSON.stringify(data),
    "EX",
    600, // 10 minutes TTL
  );
};

export const getPending = async (userId: string) => {
  const data = await redis.get(PREFIX + userId);
  return data ? JSON.parse(data) : null;
};

export const clearPending = async (userId: string) => {
  await redis.del(PREFIX + userId);
};
