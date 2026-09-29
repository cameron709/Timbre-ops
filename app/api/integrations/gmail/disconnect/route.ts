import { NextResponse } from "next/server";
import { authorisedClient } from "@/lib/email/auth";
export async function POST(request:Request){try{const{supabase}=await authorisedClient(request);await supabase.rpc("disconnect_gmail",{});await supabase.from("integration_connections").upsert({provider:"gmail",status:"disconnected",account_label:null,last_synced_at:null,last_error:null,metadata:{}});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Could not disconnect Gmail."},{status:400});}}
