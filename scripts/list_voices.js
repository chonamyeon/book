const API_KEY = 'dba0fa5bfb01d22dab803d200cc237d4bb40bae24ff1e6080510b52d5244bc11';

async function list() {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
            'xi-api-key': API_KEY,
            'Accept': 'application/json'
        }
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}

list();
