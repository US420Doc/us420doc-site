export default async function handler(event) {
  // ─── 0) Figure out what we actually got in event.body ─────────────
  let payload;
  if (typeof event.body === 'string') {
    try {
      payload = JSON.parse(event.body);
    } catch (err) {
      console.error('❌ Failed to JSON.parse(event.body):', event.body);
      return { statusCode: 400, body: 'Invalid JSON' };
    }
  } else if (typeof event.body === 'object' && event.body !== null) {
    payload = event.body;
  } else if (event.body && typeof event.body.getReader === 'function') {
    // some runtimes give you a ReadableStream here:
    const reader = event.body.getReader();
    let chunks = [], done, value;
    while (!( { done, value } = await reader.read() ).done) {
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString();
    try {
      payload = JSON.parse(text);
    } catch (err) {
      console.error('❌ Failed to parse streamed body:', text);
      return { statusCode: 400, body: 'Invalid JSON stream' };
    }
  } else {
    console.error('❌ Unknown body type:', typeof event.body, event.body);
    return { statusCode: 400, body: 'No body' };
  }

  console.log('✅ Parsed payload:', payload);

  // ─── 1) pull your four fields ──────────────────────────────────────
  const { firstName, lastName, email, phone } = payload;

  // validate:
  if (!firstName || !lastName || !email || !phone) {
    return { statusCode: 400, body: 'Missing one of firstName/lastName/email/phone' };
  }

  // ─── 2) your Square creds & location from env ─────────────────────
  const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
  const SECRET      = process.env.SQUARE_SECRET;

  // ─── 3) talk to Square ─────────────────────────────────────────────
  const resp = await fetch(
    `https://connect.squareup.com/v2/locations/${LOCATION_ID}/checkouts`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SECRET}`,
        'Accept':        'application/json'
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          order: {
            location_id: LOCATION_ID,
            line_items: [
              { name: 'Consultation + Card', quantity: '1', base_price_money: { amount: 5000, currency: 'USD' } }
            ]
          }
        },
        redirect_url: 'https://us420doc-apply.netlify.app/'
      })
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    console.error('❌ Square API returned', resp.status, text);
    return { statusCode: resp.status, body: `Square API error: ${text}` };
  }

  const { checkout } = await resp.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ url: checkout.checkout_page_url })
  };
}
