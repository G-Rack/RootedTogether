// Branded HTML + plain-text email sent after a $49 creator membership is paid.
// Table layout and inline styles only, so it renders the same in Gmail, Apple Mail and Outlook.

const BROWN = "#6B4226";
const DEEP = "#2E1B10";
const CREAM = "#FBF6EF";
const SAND = "#F1E4D3";
const MUTED = "#6F5846";
const GOLD = "#C8923F";
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

export function membershipEmail(link: string) {
  const href = esc(link);
  const subject = "Welcome to Rooted Together: create your creator account";

  const text = [
    "Welcome to Rooted Together.",
    "",
    "Your membership is confirmed. Create your creator account here:",
    link,
    "",
    "What happens next:",
    "1. Create your account with the email you paid with.",
    "2. Set up your profile and storefront.",
    "3. Connect Stripe so you can get paid, then publish your first offering.",
    "",
    "This link works once, so please keep it to yourself.",
    "Need help? Just reply to this email.",
    "",
    "Rooted Together",
  ].join("\n");

  const step = (n: string, title: string, body: string) => `
          <tr>
            <td width="36" valign="top" style="padding:0 0 14px 0;">
              <div style="width:26px;height:26px;border-radius:13px;background:${SAND};color:${BROWN};font:700 13px/26px ${SANS};text-align:center;">${n}</div>
            </td>
            <td valign="top" style="padding:2px 0 14px 0;font:400 14.5px/1.5 ${SANS};color:${MUTED};">
              <strong style="color:${DEEP};font-weight:600;">${title}</strong><br>${body}
            </td>
          </tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${SAND};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your membership is confirmed. Create your creator account in one click.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SAND};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border-radius:20px;overflow:hidden;background:${CREAM};">
        <tr>
          <td align="center" bgcolor="${BROWN}" style="background:${BROWN};padding:30px 24px;">
            <div style="display:inline-block;width:44px;height:44px;border-radius:10px;border:1.5px solid ${GOLD};color:${CREAM};font:700 18px/41px ${SERIF};text-align:center;">RT</div>
            <div style="font:600 24px/1.2 ${SERIF};color:${CREAM};letter-spacing:0.3px;margin-top:12px;">Rooted Together</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 8px 40px;">
            <div style="font:600 28px/1.25 ${SERIF};color:${DEEP};margin:0 0 14px 0;">Welcome. Your storefront awaits.</div>
            <div style="font:400 16px/1.6 ${SANS};color:${MUTED};">Thank you for joining Rooted Together. Your one-time membership is confirmed, and the last step is to create your creator account.</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:28px 40px 12px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${BROWN}" style="border-radius:999px;background:${BROWN};">
                  <a href="${href}" target="_blank" style="display:inline-block;padding:16px 40px;font:600 16px/1 ${SANS};color:${CREAM};text-decoration:none;border-radius:999px;">Create your account</a>
                </td>
              </tr>
            </table>
            <div style="font:400 12.5px/1.5 ${SANS};color:${MUTED};margin-top:14px;">This link works once, so please keep it to yourself.</div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 6px 40px;">
            <div style="border-top:1px solid ${SAND};padding-top:24px;font:600 12px/1 ${SANS};letter-spacing:1.4px;text-transform:uppercase;color:${GOLD};margin-bottom:16px;">What happens next</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${step("1", "Create your account", "Use the email you paid with.")}${step("2", "Set up your profile and storefront", "Tell your community who you are.")}${step("3", "Connect Stripe and publish", "Add your first course, ebook or routine and start earning.")}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 40px 36px 40px;">
            <div style="font:400 12.5px/1.6 ${SANS};color:${MUTED};word-break:break-all;">Button not working? Copy this link into your browser:<br><a href="${href}" style="color:${BROWN};">${href}</a></div>
          </td>
        </tr>
        <tr>
          <td align="center" bgcolor="${DEEP}" style="background:${DEEP};padding:22px 24px;">
            <div style="font:400 12.5px/1.6 ${SANS};color:#D9C7B3;">Questions? Just reply to this email.<br>&copy; Rooted Together</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
