const fetch = require('node-fetch')
const crypto = require('crypto')

// Use CommonJS exports for Netlify functions
exports.handler = async function (event, context) {
  console.log('✔ create-checkout invoked')
  console.log('✔ Incoming event.body:', event.body)

  // 1) Parse the body
  let payload
  try {
    payload = JSON.parse(event.body)
    console.log('✔ Parsed payload:', payload)
  } catch (err) {
    console.error('✘ JSON.parse failed:', err)
    return {
      statusCode: 400,
      body: 'Bad JSON'
    }
  }

  const { firstName, lastName, email, phone } = payload
  console.log('✔ Fields →', { firstName, lastName, email, phone })

  // 2) Call Square
  let resp
  try {
    console.log('✔ Calling Square CreateCheckout…')
    resp = await fetch(
      `https://connect.squareup.com/v2/locations/${process.env.SQUARE_LOCATION_ID}/checkouts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SQUARE_SECRET}`,
          Accept: 'application/json'
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: process.env.SQUARE_LOCATION_ID,
            line_items: [
              {
                name: 'Consultation + Card',
                quantity: '1',
                base_price_money: { amount: 5000, currency: 'USD' }
              }
            ]
          },
          redirect_url: 'https://us420doc-apply.netlify.app/'
        })
      }
    )
    console.log(`✔ Square responded with status ${resp.status}`)
  } catch (err) {
    console.error('✘ Fetch to Square failed:', err)
    return {
      statusCode: 502,
      body: 'Square request failed'
    }
  }

  // 3) Handle non-2xx
  if (!resp.ok) {
    const text = await resp.text()
    console.error('✘ Square non-2xx body:', text)
    return {
      statusCode: resp.status,
      body: JSON.stringify({ error: text })
    }
  }

  // 4) Everything’s good—return the checkout URL
  const { checkout } = await resp.json()
  console.log('✔ Checkout URL:', checkout.checkout_page_url)
  return {
    statusCode: 200,
    body: JSON.stringify({ url: checkout.checkout_page_url })
  }
}  // ← make sure this closes exports.handler
// netlify/functions/create-checkout.js
const fetch = require('node-fetch');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  // 1) parse incoming form data
  const { firstName, lastName, email, phone } = JSON.parse(event.body);

  // 2) build your JotForm URL with query params
  const jotform = 'https://form.jotform.com/251263863957064';  
  const redirectUrl =
    `${jotform}?name=${encodeURIComponent(firstName + ' ' + lastName)}` +
    `&email=${encodeURIComponent(email)}` +
    `&phone=${encodeURIComponent(phone)}`;

  // 3) call Square’s CreateCheckout
  const resp = await fetch(
    `https://connect.squareup.com/v2/locations/${process.env.SQUARE_LOCATION_ID}/checkouts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: process.env.SQUARE_LOCATION_ID,
          line_items: [{
            name: 'Consultation + Card',
            quantity: '1',
            base_price_money: { amount: 5000, currency: 'USD' }
          }]
        },
        redirect_url: redirectUrl
      })
    }
  );

  // 4) if Square blew up, pass the error back
  if (!resp.ok) {
    const txt = await resp.text();
    return { statusCode: resp.status, body: txt };
  }

  // 5) redirect the browser straight to Square’s checkout page
  const { checkout } = await resp.json();
  return {
    statusCode: 302,
    headers: { Location: checkout.checkout_page_url },
    body: ''
  };

