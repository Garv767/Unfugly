async function sendCaptchaToLocalAPI(base64Data) {
    try {
        const response = await fetch(base64Data);
        const blob = await response.blob();

        const formData = new FormData();
        formData.append('file', blob, 'captcha.png');

        const apiResponse = await fetch('http://localhost:8000/solve', {
            method: 'POST',
            body: formData
        });

        if (!apiResponse.ok) throw new Error('API Server error');

        const result = await apiResponse.json();
        console.log("Solved Text:", result.text);
        return result.text;
    } catch (err) {
        console.error("Failed to connect to Go Solver:", err);
        alert("Go Solver is not running on localhost:8000");
    }
}

async function runCaptchaTest() {
    const myframe = document.getElementById('signinFrame');
    if (!myframe) {
        console.error("Signin Frame not found!");
        return;
    }

    const innerDoc = myframe.contentDocument || myframe.contentWindow.document;
    const hip = innerDoc.querySelector('div#captcha_container');
    
    if (!hip) {
        console.error("Captcha container not found inside iframe");
        return;
    }

    // Ensure it's visible
    hip.style.display = 'block';

    // Trigger reload
    const reloadCaptcha = hip.querySelector('span.reloadCaptcha');
    if (reloadCaptcha) reloadCaptcha.click();

    console.log("Waiting for captcha to refresh...");

    // Wait for the new image to load
    setTimeout(async () => {
        const captchaImg = innerDoc.querySelector('#hip');
        if (!captchaImg || !captchaImg.src) {
            console.error("Captcha image element not found");
            return;
        }

        console.log("Sending Image to Go API...");
        const solvedText = await sendCaptchaToLocalAPI(captchaImg.src);
        
        // Find the input field - usually near the captcha image
        // Based on common portal structures, it's often an input with 'captcha' in the id or name
        const captchaInput =innerDoc.querySelector('#captcha');
            captchaInput.value = "test text";
        //const inputField = innerDoc.querySelector('input[name*="captcha"], #captcha_input_id'); 

        if (captchaInput && solvedText) {
            captchaInput.value = solvedText;
            console.log("Success! Captcha field filled.");
        } else {
            console.warn("Solved but couldn't find input field to fill.");
        }
    }, 1500);
}

// --- UI Logic: Add Button only on SRM Academia ---
if (window.location.href.includes('academia.srmist.edu.in')) {
    const testBtn = document.createElement('button');
    testBtn.innerText = 'Test Captcha Solver';
    testBtn.style.position = 'fixed';
    testBtn.style.top = '10px';
    testBtn.style.right = '10px';
    testBtn.style.zIndex = '9999';
    testBtn.style.padding = '10px';
    testBtn.style.backgroundColor = '#28a745';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.borderRadius = '5px';
    testBtn.style.cursor = 'pointer';

    testBtn.onclick = removeCaptcha;//runCaptchaTest;
    document.body.appendChild(testBtn);
    
    
}

function removeCaptcha() {
    const myframe = document.getElementById('signinFrame');
    const innerDoc = myframe.contentDocument || myframe.contentWindow.document;
    const hip = innerDoc.querySelector('div#captcha_container');

    hip.remove();
}