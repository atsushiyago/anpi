import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getCallResult } from "../src/lib/calle/wellness-call";

const callId = process.argv[2];
if (!callId) {
  throw new Error("Usage: tsx scripts/inspect-call.mts <callId>");
}

const call = await getCallResult(callId);
console.log(JSON.stringify(call, null, 2));
