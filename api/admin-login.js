import { signSession } from './_lib/session.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body || {};
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword || !process.env.ADMIN_SESSION_SECRET) {
        return res.status(503).json({ error: 'Admin prijava ni konfigurirana na strežniku.' });
    }

    if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ error: 'Napačni prijavni podatki' });
    }

    const token = signSession(email);
    return res.status(200).json({ token, email });
}
