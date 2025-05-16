
// netlify/functions/create-checkout.js
const crypto = require('crypto');

exports.handler = async (event, context) => {
  try {
    // 1. Parse incoming form data:
    const { firstName, lastName, email, phone } = JSON.parse(event.body);

    // 2. Build Square Checkout request:
    const payload = {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: process.env.SQUARE_LOCATION_ID,
        line_items: [{
          name: 'Consultation Fee',
          quantity: '1',
          base_price_money: { amount: 5000, currency: 'USD' }
        }]
      },
      ask_for_shipping_address: false,
      merchant_support_email: 'support@us420doc.com',
      redirect_url: `${process.env.SITE_URL}/apply/index.html`,
      // optional buyer info for your records:
      pre_populate_buyer_email: email,
      pre_populate_buyer_name: `${firstName} ${lastName}`,
      pre_populate_buyer_phone: phone
    };

    // 3. POST to the correct Checkout endpoint:
    const response = await fetch(
      `https://connect.squareup.com/v2/locations/${process.env.SQUARE_LOCATION_ID}/checkouts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`
        },
        body: JSON.stringify(payload)
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
