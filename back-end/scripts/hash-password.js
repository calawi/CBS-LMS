import bcrypt from "bcryptjs";

const pwd = process.argv[2] || "123456";
const hash = await bcrypt.hash(pwd, 10);
console.log(hash);
const ok = await bcrypt.compare(pwd, hash);
console.log("self-check:", ok);
