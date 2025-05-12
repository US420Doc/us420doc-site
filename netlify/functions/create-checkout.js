export default async function handler(event) {
  // Parse the four inputs from the client
  const { firstName, lastName, email, phone } = JSON.parse(event.body);

  // Read your Square credentials & location from environment
  const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
  const SECRET      = process.env.SQUARE_SECRET;

  // 1) Call Square’s CreateCheckout endpoint
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
        idempotency_key: crypto.randomUUID(),   // ensures idempotency
        order: {
          order: {
            location_id: LOCATION_ID,
            line_items: [
              {
                name: 'Consultation + Card',
                quantity: '1',
                base_price_money: { amount: 5000, currency: 'USD' }
              }
            ]
          }
        },
        // After payment, send them back to your apply page:
        redirect_url: 'https://us420doc-apply.netlify.app/'
      })
    }
  );

  // 2) Handle errors
  if (!resp.ok) {
    const text = await resp.text();
    console.error('❌ Square API error:', resp.status, text);
    return {
      statusCode: resp.status,
      body: `Square API error: ${text}`
    };
  }

  // 3) Return the generated checkout URL
  const { checkout } = await resp.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ url: checkout.checkout_page_url })
  };
}

