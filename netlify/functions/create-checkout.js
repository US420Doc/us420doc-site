export default async function handler(event) {
  // 1) Parse user input
  const { firstName, lastName, email, phone } = await event.json();

  // 2) Read your Square credentials
  const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
  const SECRET      = process.env.SQUARE_SECRET;

  // 3) Call Square’s CreateCheckout endpoint using the built-in fetch
  const resp = await fetch(
    `https://connect.squareupsandbox.com/v2/locations/${LOCATION_ID}/checkouts`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SECRET}`,
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          order: {
            location_id: LOCATION_ID,
            line_items: [
              {
                name: 'Consultation + Card',
                quantity: '1',
                base_price_money: { amount: 5000, currency: 'USD' },
              }
            ]
          }
        },
        // sandbox redirect back to your apply page
        redirect_url: 'https://us420doc-apply.netlify.app/'
      })
    }
  );

  // 4) If Square errored, forward that error
  if (!resp.ok) {
    const text = await resp.text();
    return {
      statusCode: resp.status,
      body:       JSON.stringify({ error: text })
    };
  }

  // 5) Otherwise extract the checkout URL and return it
  const { checkout } = await resp.json();
  return {
    statusCode: 200,
    body:       JSON.stringify({ url: checkout.checkout_page_url })
  };
}
