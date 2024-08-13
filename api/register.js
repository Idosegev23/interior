import fetch from 'node-fetch';

async function handler(event, context) {
  // Set a timeout slightly less than Vercel's 10-second limit
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Function execution timed out')), 9000)
  );

  try {
    // Check for SENDGRID_API environment variable
    if (!process.env.SENDGRID_API) {
      console.error('SENDGRID_API environment variable is not set');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      };
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
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      };
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
    console.error('Error:', error);
    return {
      statusCode: error.message === 'Function execution timed out' ? 504 : 500,
      body: JSON.stringify({ error: error.message === 'Function execution timed out' ? 'Request timed out' : 'Failed to add contact to SendGrid list' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }
}

export default handler;