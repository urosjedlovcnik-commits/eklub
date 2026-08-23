import { verifySessionToken } from './_lib/session.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
        ? auth.slice(7)
        : (req.body?.token || req.query?.token || '');

    const session = verifySessionToken(token);
    if (!session) {
        return res.status(401).json({ valid: false });
    }

    return res.status(200).json({
        valid: true,
        email: session.email,
        loginTime: session.loginTime,
        exp: session.exp
    });
}
