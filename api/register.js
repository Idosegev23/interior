import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, firstName, lastName, phoneNumber, workshopType } = req.body;

    try {
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
            phone_number: phoneNumber,
            custom_fields: {
              Workshop: workshopType
            }
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('SendGrid API Error:', errorData);
        throw new Error('Failed to add contact to SendGrid list');
      }

      res.status(200).json({ message: 'Contact added successfully' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to add contact to SendGrid list' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}