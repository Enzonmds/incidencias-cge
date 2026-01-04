import axios from 'axios';

async function testConnection() {
    console.log('Testing WhatsApp POST to 54111571483037...');
    try {
        const token = 'EAAMFooz0AzEBQSqDW8Oh7SQ2rwFKhtUgSn6uY8WElpD9bwZBBucrZA9Y2yEXVLHWlyWjqbocyefCYhNxoCvmJYSqtfRNcSQZCtXIQBnUcElPcZCErjMwjZBRedGW37AVb8e8yqRFyajaGGmblokL5qNsmoUjN3wfqobFOk9yoqwCor4JpbYPn8Eoo389cdQUfvZBBj4Ya762kxJ45pZApk0pOXi3kmHtZBk3aJu9o2uX1D58w8B9MthW0kqvZBuVQZAqUnZBow2lfCK6uZBrrEnHhyaVPDZBsdy0qGWqGU6wZD';
        const url = 'https://graph.facebook.com/v17.0/949588524901447/messages';
        const data = {
            messaging_product: "whatsapp",
            to: "54111571483037",
            type: "template",
            template: { name: "hello_world", language: { code: "en_US" } }
        };

        const res = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('SUCCESS! Status:', res.status, res.data);
    } catch (error) {
        console.error('FAILED.');
        if (error.response) {
            console.log('Meta Response:', error.response.status, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Network/Code Error:', error.message);
        }
    }
}

testConnection();
