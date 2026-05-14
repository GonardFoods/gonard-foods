import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const TO = "gfoods@telus.net";
const FROM = "Gonard Foods Website <noreply@gonardfoods.com>";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, company, message } = await req.json() as {
      firstName?: string;
      lastName?: string;
      email?: string;
      company?: string;
      message?: string;
    };

    if (!firstName?.trim() || !email?.trim() || !message?.trim()) {
      return Response.json({ error: "First name, email, and message are required." }, { status: 400 });
    }

    const name = [firstName.trim(), lastName?.trim()].filter(Boolean).join(" ");

    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email.trim(),
      subject: `New inquiry from ${name}${company ? ` (${company.trim()})` : ""}`,
      text: [
        `Name: ${name}`,
        `Email: ${email.trim()}`,
        company?.trim() ? `Company: ${company.trim()}` : null,
        "",
        message.trim(),
      ]
        .filter((l) => l !== null)
        .join("\n"),
      html: `
        <p><strong>Name:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${esc(email.trim())}">${esc(email.trim())}</a></p>
        ${company?.trim() ? `<p><strong>Company:</strong> ${esc(company.trim())}</p>` : ""}
        <hr/>
        <p style="white-space:pre-wrap">${esc(message.trim())}</p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Contact route error:", e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function esc(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
