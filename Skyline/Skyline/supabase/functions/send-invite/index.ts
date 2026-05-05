// Supabase Edge Function: send-invite
// Sends a Skyline invitation email via Resend API
//
// Deploy with: supabase functions deploy send-invite
// Set secret:  supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to_email, inviter_name, message } = await req.json();

    if (!to_email) {
      return new Response(
        JSON.stringify({ error: "to_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a1f17; border-radius: 20px; overflow: hidden; border: 1px solid #1a3a2e;">
      <div style="background: linear-gradient(135deg, #0d2b1f, #0a1f17); padding: 40px 32px; text-align: center;">
        <div style="font-size: 36px; margin-bottom: 8px;">🏙️</div>
        <h1 style="color: #34d399; font-size: 24px; margin: 0 0 6px 0; letter-spacing: -0.5px;">Skyline</h1>
        <p style="color: #6b8f82; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Memory City Builder</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #d1fae5; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
          <strong style="color: #34d399;">${inviter_name}</strong> has invited you to join Skyline — a platform where your life memories rise as buildings in a beautiful 3D city.
        </p>
        ${message ? `<div style="background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;"><p style="color: #a7f3d0; font-size: 13px; font-style: italic; margin: 0;">"${message}"</p></div>` : ""}
        <a href="https://skyline-nine-roan.vercel.app" style="display: block; text-align: center; padding: 14px 24px; background: linear-gradient(135deg, #34d399, #10b981); color: white; text-decoration: none; border-radius: 999px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">
          Join Skyline
        </a>
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid #1a3a2e; text-align: center;">
        <p style="color: #6b8f82; font-size: 10px; margin: 0;">Your memories don't just sit in a list — they rise, expand, and shape a city that's uniquely yours.</p>
      </div>
    </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Skyline <onboarding@resend.dev>",
        to: [to_email],
        subject: `${inviter_name} invited you to Skyline!`,
        html: htmlBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
