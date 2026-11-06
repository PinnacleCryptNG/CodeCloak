// FICTIONAL — for hackathon demo only.
export type User = { id: string; email: string; password: string };

const users: User[] = [
  { id: "u_1", email: "ada@example.test", password: "correct-horse-battery" },
  { id: "u_2", email: "lin@example.test", password: "hunter2" },
];

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return users.find((u) => u.email === email);
}
