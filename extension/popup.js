document.getElementById('open-academia').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://academia.srmist.edu.in' });
});

document.getElementById('open-webapp').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://unfugly.app' });
});
