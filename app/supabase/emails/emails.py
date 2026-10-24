# Branded WrongTrain auth emails for Supabase. Email-safe: tables, inline styles, light background
# (works in Gmail, Apple Mail, Outlook). Run: python3 app/supabase/emails/emails.py app/supabase/emails
# It writes templates.json (send it to the Management API: PATCH /v1/projects/<ref>/config/auth)
# and previews with a made-up code. Or paste each template into Authentication → Emails.
import json, sys

def email(pre, heading, lead, code, after, why):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>WrongTrain</title></head>
<body style="margin:0;padding:0;background:#F2F4F6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F4F6;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
    <tr><td style="padding:0 4px 18px 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:10px;"><img src="https://wrongtrain.lol/icon.png" width="36" height="36" alt="" style="display:block;border-radius:9px;"></td>
        <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;color:#12171B;letter-spacing:-0.3px;">WrongTrain</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#FFFFFF;border-radius:16px;border:1px solid #E3E7EA;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td height="5" style="background:#B193EA;font-size:0;line-height:0;">&nbsp;</td><td height="5" style="background:#FF7F78;font-size:0;line-height:0;">&nbsp;</td><td height="5" style="background:#8FD45C;font-size:0;line-height:0;">&nbsp;</td><td height="5" style="background:#6FA8E8;font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:32px 32px 30px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#12171B;">
        <h1 style="margin:0 0 10px 0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.3px;">{heading}</h1>
        <p style="margin:0 0 24px 0;font-size:16px;line-height:1.55;color:#3D4850;">{lead}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:#F6F7F8;border:1px solid #E3E7EA;border-radius:12px;padding:20px 12px;">
          <div style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:34px;line-height:1;font-weight:700;letter-spacing:8px;color:#12171B;">{code}</div>
        </td></tr></table>
        <p style="margin:20px 0 0 0;font-size:14px;line-height:1.55;color:#5E6B74;">{after}</p>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:20px 8px 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8D9AA2;text-align:center;">
      {why}<br>
      <a href="https://wrongtrain.lol" style="color:#8D9AA2;">wrongtrain.lol</a> &middot; <a href="mailto:info@wrongtrain.lol" style="color:#8D9AA2;">info@wrongtrain.lol</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>'''

T = '{{ .Token }}'
AFTER = 'It works once and expires in an hour. No password needed, ever.'
WHY = "You're getting this because someone asked to sign in to WrongTrain with this email address. If it wasn't you, you can ignore it."
sign_in = email(f'Your code is {T}', 'Your sign-in code',
    'Type this code in WrongTrain to sign in and see your trips.', T, AFTER, WHY)
welcome = email(f'Your code is {T}', 'Welcome to WrongTrain',
    'Type this code in WrongTrain to finish signing in. Then you\'re in, and your group\'s trip is right there.', T, AFTER, WHY)
change = email(f'Your code is {T}', 'Confirm your new email',
    'Type this code in WrongTrain to move your account to <b>{{ .NewEmail }}</b>. Your trips stay just as they are.', T,
    'It works once and expires in an hour.', "You're getting this because someone asked to change a WrongTrain account's email to this address. If it wasn't you, you can ignore it.")

cfg = {
  'mailer_subjects_magic_link': 'Your WrongTrain sign-in code',
  'mailer_templates_magic_link_content': sign_in,
  'mailer_subjects_confirmation': 'Welcome to WrongTrain: your sign-in code',
  'mailer_templates_confirmation_content': welcome,
  'mailer_subjects_email_change': 'Confirm your new email for WrongTrain',
  'mailer_templates_email_change_content': change,
}
d = sys.argv[1]
json.dump(cfg, open(d + '/templates.json', 'w'))
prev = lambda h: h.replace(T, '48213907').replace('{{ .NewEmail }}', 'you@example.com')
open(d + '/preview.html', 'w').write(prev(welcome))
open(d + '/preview-signin.html', 'w').write(prev(sign_in))
