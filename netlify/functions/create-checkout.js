// netlify/functions/create-checkout.js


// If you upgraded to Node 18+, you can drop the line above and use the built-in fetch.

// crypto is used to generate an idempotency key:
    const crypto = require('crypto');

    exports.handler = async (event, context) => {
    try {
    // 1. Parse incoming form data:
    const { firstName, lastName, email, phone } = JSON.parse(event.body);

    // 2. Build Square Checkout request:
    const body = {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: process.env.SQUARE_LOCATION_ID,
        line_items: [
          {
            name: 'Consultation Fee',
            quantity: '1',
            base_price_money: { amount: 5000, currency: 'USD' }
          }
        ]
      },
      ask_for_shipping_address: false,
      merchant_support_email: 'support@us420doc.com',
      redirect_url: `${process.env.URL}/apply/index.html`
    };

    // 3. Call Square’s API:
    const response = await fetch(
      'https://connect.squareupsandbox.com/v2/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Square API error:', errText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to create checkout session' })
      };
    }

    const { checkout } = await response.json();

    // 4. Return the URL back to the frontend:
    return {
      statusCode: 200,
      body: JSON.stringify({ url: checkout.checkout_page_url })
    };

  } catch (e) {
    console.error('Function error:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
