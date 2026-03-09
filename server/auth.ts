import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export function generateToken(userId: number) {
return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export async function hashPassword(password: string) {
const salt = await bcrypt.genSalt(10);
return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string) {
return bcrypt.compare(password, hash);
}

export function verifyToken(token: string) {
return jwt.verify(token, JWT_SECRET) as { userId: number };
}
