

const API_KEY = 'dba0fa5bfb01d22dab803d200cc237d4bb40bae24ff1e6080510b52d5244bc11';

async function listVoices() {
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': API_KEY }
        });
        const text = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', text);
    } catch (err) {
        console.error('Error:', err);
    }
}

listVoices();
