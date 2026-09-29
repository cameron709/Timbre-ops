import { createCipheriv,createDecipheriv,createHash,randomBytes } from "node:crypto";

const key = () => {
  const secret=process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  if(!secret) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not configured.");
  return createHash("sha256").update(secret).digest();
};
export function encryptSecret(value:string){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv),encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return [iv,cipher.getAuthTag(),encrypted].map(x=>x.toString("base64url")).join(".");}
export function decryptSecret(value:string){const[iv,tag,data]=value.split(".").map(x=>Buffer.from(x,"base64url")),decipher=createDecipheriv("aes-256-gcm",key(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(data),decipher.final()]).toString("utf8");}
