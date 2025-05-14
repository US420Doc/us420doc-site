// netlify/functions/create-checkout.js

// 1) Use CommonJS exports.handler = … (you’ve already done this)
exports.handler = async function(event, context) {
  // 🔥 Log entry and raw body
  console.log('🏁 create-checkout invoked');
  console.log('Incoming event.body:', event.body);

  // 2) Parse the JSON
  let payload;
  try {
    payload = JSON.parse(event.body);
    console.log('✅ Parsed payload:', payload);
  } catch (err) {
    console.error('❌ JSON.parse failed:', err);
    return {
      statusCode: 400,
      body: 'Bad JSON'
    };
  }

  const { firstName, lastName, email, phone } = payload;

  // 🔥 Log the individual fields
  console.log('Fields →', { firstName, lastName, email, phone });

  // 3) Call Square
  let resp;
  try {
    console.log('▶️ Calling Square CreateCheckout…');
    resp = await fetch(
      `https://connect.squareupsandbox.com/v2/locations/${process.env.SQUARE_LOCATION_ID}/checkouts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SQUARE_SECRET}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: process.env.SQUARE_LOCATION_ID,
            line_items: [
              { name: 'Consultation + Card', quantity: '1', base_price_money: { amount: 5000, currency: 'USD' } }
            ]
          },
          redirect_url: 'https://us420doc-apply.netlify.app/'
        })
      }
    );
    console.log(`🟦 Square responded with status ${resp.status}`);
  } catch (err) {
    console.error('❌ Fetch to Square failed:', err);
    return {
      statusCode: 502,
      body: 'Square request failed'
    };
  }

  // 4) Handle non-2xx
  if (!resp.ok) {
    const text = await resp.text();
    console.error('❌ Square non-2xx body:', text);
    return {
      statusCode: resp.status,
      body: JSON.stringify({ error: text })
    };
  }

  // 5) Everything’s good—return the URL
  const { checkout } = await resp.json();
  console.log('✅ Checkout URL:', checkout.checkout_page_url);
  return {
    statusCode: 200,
    body: JSON.stringify({ url: checkout.checkout_page_url })
  };
};
