import fetch from 'node-fetch';

async function handler(event, context) {
  // Set a timeout slightly less than Vercel's 10-second limit
  const TIMEOUT = 9000;
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Function execution timed out')), TIMEOUT);
  });

  try {
    // Check for SENDGRID_API environment variable
    if (!process.env.SENDGRID_API) {
      throw new Error('SENDGRID_API environment variable is not set');
    }

    // Check if the request method is POST
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        body: JSON.stringify({ error: 'Method Not Allowed' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      };
    }

    const { email, firstName, lastName, phoneNumber, workshopType } = JSON.parse(event.body);

    // Input validation
    if (!email || !firstName || !lastName || !phoneNumber || !workshopType) {
      throw new Error('Missing required fields');
    }

    const sendGridPromise = fetch('https://api.sendgrid.com/v3/marketing/contacts', {
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
      })
    });

    // Race the SendGrid API call against the timeout
    const response = await Promise.race([sendGridPromise, timeoutPromise]);

    clearTimeout(timeoutId);  // Clear the timeout if the API call succeeds

    if (!response.ok) {
      const errorData = await response.json();
      console.error('SendGrid API Error:', errorData);
      throw new Error('Failed to add contact to SendGrid list');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Contact added successfully' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);  // Ensure timeout is cleared in case of error
    console.error('Error:', error);
    
    let statusCode, errorMessage;
    if (error.message === 'Function execution timed out') {
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

    return {
      statusCode,
      body: JSON.stringify({ error: errorMessage }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }
}

export default handler;