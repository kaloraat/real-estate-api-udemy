import { randomBytes, pbkdf2 } from "crypto";

export const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    // pbkdf2 algorithm with 1000 iterations, 64 length and sha512 hashing
    pbkdf2(password, salt, 1000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
};

export const comparePassword = (password, hashed) => {
  return new Promise((resolve, reject) => {
    const [salt, key] = hashed.split(":");
    pbkdf2(password, salt, 1000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
};
