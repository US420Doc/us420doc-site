import fetch from 'node-fetch';

export default async function handler(event) {
  const { firstName, lastName, email, phone } = JSON.parse(event.body);

  const resp = await fetch(
    'https://connect.squareup.com/v2/locations/YOUR_LOCATION_ID/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.SQUARE_SECRET}`,
        'Accept':        'application/json'
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          order: {
            location_id: 'YOUR_LOCATION_ID',
            line_items: [
              {
                name: 'Consultation + Card',
                quantity: '1',
                base_price_money: { amount: 5000, currency: 'USD' }
              }
            ]
          }
        },
        redirect_url: 'https://us420doc-apply.netlify.app/'
      })
    }
  );

  if (!resp.ok) {
    return { statusCode: resp.status, body: await resp.text() };
  }
  const { checkout } = await resp.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ url: checkout.checkout_page_url })
  };
}
