import crypto from 'crypto';

const SESSION_DAYS = 7;

export function signSession(email) {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) throw new Error('ADMIN_SESSION_SECRET not configured');
    const payload = {
        email,
        loginTime: Date.now(),
        exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    return `${body}.${sig}`;
}

export function verifySessionToken(token) {
    if (!token || typeof token !== 'string') return null;
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) return null;
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;
    const body = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    if (sig !== expected) return null;
    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (!payload.email || payload.exp < Date.now()) return null;
        const allowedEmail = process.env.ADMIN_EMAIL;
        if (allowedEmail && payload.email !== allowedEmail) return null;
        return payload;
    } catch {
        return null;
    }
}
