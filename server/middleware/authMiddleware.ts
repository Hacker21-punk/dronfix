import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth";

export function requireAuth(req: any, res: Response, next: NextFunction) {
const authHeader = req.headers.authorization;

if (!authHeader) {
return res.status(401).json({ message: "Unauthorized" });
}

const token = authHeader.split(" ")[1];

try {
const decoded = verifyToken(token);
req.user = decoded;
next();
} catch {
return res.status(401).json({ message: "Invalid token" });
}
}
