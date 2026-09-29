import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authorisedClient } from "@/lib/email/auth";
import { encryptSecret } from "@/lib/email/crypto";
import { googleAuthorisationUrl } from "@/lib/email/google";

export async function POST(request:Request){try{const{token}=await authorisedClient(request);const state=randomBytes(24).toString("base64url");const response=NextResponse.json({url:googleAuthorisationUrl(state)});const options={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,maxAge:600,path:"/api/integrations/gmail/callback"};response.cookies.set("gmail_oauth_state",state,options);response.cookies.set("gmail_oauth_session",encryptSecret(token),options);return response;}catch(error){return NextResponse.json({error:error instanceof Error&&error.message==="AUTH_REQUIRED"?"Sign in again.":error instanceof Error?error.message:"Could not start Gmail connection."},{status:401});}}
