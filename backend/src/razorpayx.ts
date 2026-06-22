const BASE = 'https://api.razorpay.com/v1';

function auth(): string {
  const id = process.env.RAZORPAYX_KEY_ID;
  const secret = process.env.RAZORPAYX_KEY_SECRET;
  if (!id || !secret) throw new Error('RAZORPAYX_KEY_ID or RAZORPAYX_KEY_SECRET not set');
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

async function post(path: string, body: object): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth() },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data?.error?.description ?? `RazorpayX ${res.status}`);
  return data;
}

export async function createContact(params: {
  name: string;
  email: string;
  referenceId: string;
}): Promise<string> {
  const data = await post('/contacts', {
    name: params.name,
    email: params.email,
    type: 'vendor',
    reference_id: params.referenceId,
  });
  return data.id;
}

export async function createFundAccount(params: {
  contactId: string;
  name: string;
  accountNumber: string;
  ifsc: string;
}): Promise<string> {
  const data = await post('/fund_accounts', {
    contact_id: params.contactId,
    account_type: 'bank_account',
    bank_account: { name: params.name, ifsc: params.ifsc, account_number: params.accountNumber },
  });
  return data.id;
}

export async function createPayout(params: {
  fundAccountId: string;
  amountInRupees: number;
  narration: string;
}): Promise<string> {
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!accountNumber) throw new Error('RAZORPAYX_ACCOUNT_NUMBER not set');
  const data = await post('/payouts', {
    account_number: accountNumber,
    fund_account_id: params.fundAccountId,
    amount: Math.round(params.amountInRupees * 100),
    currency: 'INR',
    mode: 'IMPS',
    purpose: 'payout',
    narration: params.narration,
  });
  return data.id;
}
