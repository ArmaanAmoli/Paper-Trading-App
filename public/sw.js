self.addEventListener('push', event => {
    console.log('[Service Worker] Push event triggered!');
    
    let title = 'Paper Trading App';
    let body = 'New update available.';
    let icon = '/favicon.ico';

    if (event.data) {
        try {
            const data = event.data.json();
            console.log('[Service Worker] Parsed JSON:', data);

            // 1. Safely extract the title
            title = data.title || title;

            // 2. Safely extract the body (Handles BOTH flat and nested formats)
            // The ?. operator prevents the "Cannot read properties of undefined" crash
            body = data.body || data.options?.body || 'Check your trading dashboard.';
            
            // 3. Safely extract the icon
            icon = data.icon || data.options?.icon || icon;

        } catch (e) {
            // Fallback if the backend sent a plain text string instead of JSON
            console.log('[Service Worker] Payload is plain text:', event.data.text());
            body = event.data.text() || body;
        }
    }

    const options = {
        body: body,
        icon: icon,
        data: {
            dateOfArrival: Date.now()
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});