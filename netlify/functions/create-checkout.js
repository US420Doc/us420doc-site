// netlify/functions/create-checkout.js

  const crypto = require('crypto');

  exports.handler = async (event, context) => {
 
 // 1) parse incoming form data
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Bad JSON' };
  }
  const { firstName, lastName, email, phone } = payload;

  // 2) build your JotForm URL with query params
  const jotformUrl = 'https://form.jotform.com/251263863957064';
  const redirectUrl =
    `${jotformUrl}?name=${encodeURIComponent(firstName + ' ' + lastName)}` +
    `&email=${encodeURIComponent(email)}` +
    `&phone=${encodeURIComponent(phone)}`;

  // 3) call Square’s CreateCheckout
  const resp = await fetch(
    `https://connect.squareup.com/v2/locations/${process.env.SQUARE_LOCATION_ID}/checkouts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_SECRET}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: process.env.SQUARE_LOCATION_ID,
          line_items: [
            {
              name:             'Consultation + Card',
              quantity:         '1',
              base_price_money: { amount: 5000, currency: 'USD' }
            }
          ]
        },
        redirect_url: redirectUrl
      })
    }
  );

  // 4) if Square blew up, pass the error back
  if (!resp.ok) {
    const errText = await resp.text();
    return { statusCode: resp.status, body: errText };
  }

  // 5) redirect the browser straight to Square’s checkout page
  const { checkout } = await resp.json();
  return {
    statusCode: 302,
    headers: { Location: checkout.checkout_page_url },
    body: '',
  };
};

