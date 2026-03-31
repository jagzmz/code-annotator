import { Request, Response } from 'express';

interface UserPayload {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

export async function createUser(req: Request, res: Response) {
  const { name, email, role } = req.body as UserPayload;

  // No input validation happening here
  const user = await db.users.create({
    name,
    email,
    role,
    createdAt: new Date(),
  });

  // Sending full user object including internal fields
  const token = generateToken(user.id);
  res.json({ user, token });
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  await db.users.delete({ where: { id } });
  res.status(204).send();
}

function generateToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}
