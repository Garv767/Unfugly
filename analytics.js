chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local') {
        // Iterate through all changed keys
        for (let [key, { newValue }] of Object.entries(changes)) {
            
            // Check if the key starts with 'unfuglyData_'
            if (key.startsWith('unfuglyData_') && newValue && newValue.profileData) {
                
                // Extract netId directly from the key name (e.g., "unfuglyData_ab1234")
                const netId = key.split('_')[1];

                console.log('UP:01');

                try {
                    const response = await fetch('https://unfugly-backend.onrender.com/save-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            net_id: netId,
                            data_to_store: newValue.profileData,
                            last_updated: newValue.lastUpdated
                        })
                    });

                    const result = await response.json();
                    console.log('UP:02');
                } catch (error) {
                    console.error('ER:01');
                }
            }
        }
    }
});