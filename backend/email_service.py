import os
import re
import asyncio
import ipaddress
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from html.parser import HTMLParser
from urllib.parse import urlparse
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Pengiriman email lewat SMTP (mis. Gmail App Password, Brevo, Resend SMTP, dll).
# Semua opsional: kalau SMTP_HOST kosong, fitur email (laporan mingguan) nonaktif
# dan aplikasi tetap berjalan normal.
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "CIRCLE")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


def _send_smtp(to: str, subject: str, html: str, reply_to: str | None) -> str:
    host = os.environ.get("SMTP_HOST", "").strip()
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "")
    from_addr = os.environ.get("EMAIL_FROM", "").strip() or user
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((EMAIL_FROM_NAME, from_addr))
    msg["To"] = to
    if reply_to:
        msg["Reply-To"] = reply_to
    msg["Message-ID"] = make_msgid()
    msg.set_content("Email ini berformat HTML. Buka dengan aplikasi email yang mendukung HTML.")
    msg.add_alternative(html, subtype="html")
    server = smtplib.SMTP_SSL(host, port, timeout=30) if port == 465 else smtplib.SMTP(host, port, timeout=30)
    with server:
        if port != 465:
            server.starttls()
        if user:
            server.login(user, password)
        server.send_message(msg)
    return msg["Message-ID"]


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    _assert_safe_email(subject, html)
    if not os.environ.get("SMTP_HOST", "").strip() or not (os.environ.get("EMAIL_FROM", "").strip() or os.environ.get("SMTP_USER", "").strip()):
        logger.warning("Email dilewati: SMTP_HOST / EMAIL_FROM belum diatur")
        raise HTTPException(status_code=503, detail="Email is temporarily unavailable")
    try:
        return await asyncio.to_thread(_send_smtp, to, subject, html, reply_to or EMAIL_REPLY_TO)
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise HTTPException(status_code=502, detail="Failed to send email")
