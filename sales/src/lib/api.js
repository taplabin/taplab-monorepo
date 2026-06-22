import { getAuth } from 'firebase/auth';
const API_BASE = '/api';
export async function brokerFetch(path, options = {}) {
    const user = getAuth().currentUser;
    if (!user)
        throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers ?? {}),
        },
    });
}
