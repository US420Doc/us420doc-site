
// netlify/functions/create-checkout.js

const crypto = require('crypto');
const fetch = require('node-fetch');     // only if you actually installed node-fetch in dependencies

// read your Square credentials from Netlify env vars
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SECRET      = process.env.SQUARE_SECRET;

exports.handler = async function(event, context) {
  // 1) Parse the incoming JSON payload
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }
  const { firstName, lastName, email, phone } = data;

  // 2) Build Square CreateCheckout request
  const body = {
    idempotency_key: crypto.randomUUID(),
    order: {
      order: {
        location_id: LOCATION_ID,
        line_items: [{
          name: 'Consultation + Card',
          quantity: '1',
          base_price_money: { amount: 5000, currency: 'USD' }
        }]
      }
    },
    redirect_url: 'https://us420doc-apply.netlify.app/'
  };

  // 3) Send it to Square
  let resp;
  try {
    resp = await fetch(
      `https://connect.squareupsandbox.com/v2/locations/${LOCATION_ID}/checkouts`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${SECRET}`,
          'Content-Type':  'application/json',
          'Accept':        'application/json'
        },
        body: JSON.stringify(body)
      }
    );
  } catch (err) {
    console.error('Fetch error:', err);
    return { statusCode: 502, body: 'Square request failed' };
  }

  // 4) Handle a non-2xx from Square
  if (!resp.ok) {
    const text = await resp.text();
    return {
      statusCode: resp.status,
      body: JSON.stringify({ error: text })
    };
  }

  // 5) Everything succeeded—return the checkout URL
  const { checkout } = await resp.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ url: checkout.checkout_page_url })
  };
};

