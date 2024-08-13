const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  const TIMEOUT = 8000; // 8 seconds to allow for some overhead

  // Create an AbortController for the fetch request
  const controller = new AbortController();
  const { signal } = controller;

  // Set a timeout to abort the fetch request
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT);

  try {
    // Check for SENDGRID_API environment variable
    if (!process.env.SENDGRID_API) {
      throw new Error('SENDGRID_API environment variable is not set');
    }

    // Check if the request method is POST
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, firstName, lastName, phoneNumber, workshopType } = req.body;

    // Input validation
    if (!email || !firstName || !lastName || !phoneNumber || !workshopType) {
      throw new Error('Missing required fields');
    }

    const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        list_ids: ['9a3ae0d9-7068-4371-83ec-fc6cacc340b6'],
        contacts: [{
          email,
          first_name: firstName,
          last_name: lastName,
          phone: phoneNumber,
          custom_fields: {
            e1_T: workshopType
          }
        }]
      }),
      signal // Pass the AbortController signal to the fetch request
    });

    clearTimeout(timeoutId); // Clear the timeout if the API call succeeds

    if (!response.ok) {
      const errorData = await response.json();
      console.error('SendGrid API Error:', errorData);
      throw new Error('Failed to add contact to SendGrid list');
    }

    return res.status(200).json({ message: 'Contact added successfully' });
  } catch (error) {
    clearTimeout(timeoutId); // Ensure timeout is cleared in case of error

    console.error('Error:', error.message, error.stack);
    
    let statusCode, errorMessage;
    if (error.name === 'AbortError') {
      statusCode = 504;
      errorMessage = 'Request timed out';
    } else if (error.message === 'Missing required fields') {
      statusCode = 400;
      errorMessage = 'Missing required fields';
    } else if (error.message === 'SENDGRID_API environment variable is not set') {
      statusCode = 500;
      errorMessage = 'Server configuration error';
    } else {
      statusCode = 500;
      errorMessage = 'Failed to add contact to SendGrid list';
    }

    return res.status(statusCode).json({ error: errorMessage });
  }
};
