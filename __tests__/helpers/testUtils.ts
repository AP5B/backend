import jwt from "jsonwebtoken";

export const generateTestToken = (
  userId: string | number,
  email = "test@example.com",
  role = "Student",
  username: string,
): string => {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign(
    {
      id: userId,
      email,
      role,
      username,
    },
    JWT_SECRET,
    { expiresIn: "1h" },
  );
};
