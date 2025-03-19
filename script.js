// Cloudinary configuration
const cloudName = 'ml_default';
const apiKey = '828344228488878';
const uploadPreset = 'ML_image';

// Initialize variables for location
let userLocation = null;

// Get device information
const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    language: navigator.language
};

// Function to get location
function getLocation() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    resolve(userLocation);
                },
                error => {
                    console.error("Error getting location:", error);
                    resolve(null);
                }
            );
        } else {
            console.log("Geolocation not supported");
            resolve(null);
        }
    });
}

// Function to upload image to Cloudinary
async function uploadToCloudinary(file) {
    const timestamp = Math.round((new Date).getTime()/1000);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('timestamp', timestamp);
    formData.append('api_key', apiKey);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        console.log('Upload response:', data);  // Add this for debugging
        
        if (!response.ok) {
            console.error('Cloudinary Error:', data);
            throw new Error(data.error?.message || 'Upload failed');
        }
        
        return data.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }
}

// Handle image preview
const photoInput = document.getElementById('photo');
const imagePreview = document.getElementById('imagePreview');

photoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.style.display = 'block';
            imagePreview.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// Handle form submission
document.getElementById('attendanceForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get elements
    const submitButton = document.querySelector('.submit-btn');
    const btnText = submitButton.querySelector('.btn-text');
    const loader = submitButton.querySelector('.loader');
    const formCard = document.querySelector('.form-card');
    const notification = document.getElementById('notification');

    // Show loading state
    const setLoading = (loading) => {
        if (loading) {
            submitButton.classList.add('loading');
            formCard.classList.add('processing');
            btnText.textContent = 'Submitting...';
            submitButton.disabled = true;
        } else {
            submitButton.classList.remove('loading');
            formCard.classList.remove('processing');
            btnText.textContent = 'Submit';
            submitButton.disabled = false;
        }
    };

    // Show notification
    const showNotification = (message, type) => {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.className = 'notification';
        }, 5000);
    };

    try {
        setLoading(true);  // Start loading immediately when form is submitted

        // Get location first
        await getLocation();

        // Get form values
        const name = document.getElementById('name').value;
        const inTime = document.getElementById('inTime').value;
        const outTime = document.getElementById('outTime').value;
        const photoFile = document.getElementById('photo').files[0];

        // Upload photo to Cloudinary
        console.log('Uploading photo to Cloudinary...');
        const photoUrl = await uploadToCloudinary(photoFile);
        console.log('Photo uploaded successfully:', photoUrl);

        // Prepare data for Google Sheets
        const timestamp = new Date().toISOString();
        const formData = {
            timestamp,
            name,
            inTime,
            outTime,
            photoUrl,
            location: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : 'Not available',
            deviceInfo: JSON.stringify(deviceInfo)
        };

        // Send to Google Sheets
        const scriptURL = 'https://script.google.com/macros/s/AKfycbwMJ-ZCcmTP_BVNwdQoy_7uVUfmZuoKJ_2cdZbY0738aWhWKUll2IF2xJiPujmB6iM3/exec';
        
        console.log('Submitting data to Google Sheets:', formData);
        const response = await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        console.log('Response received:', response);
        
        // Since we're using no-cors mode, we won't get a proper response
        // We'll consider it successful if we reach this point
        showNotification('Form submitted successfully!', 'success');
        this.reset();
        imagePreview.style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        showNotification('Error submitting form. Please try again.', 'error');
    } finally {
        setLoading(false);  // Stop loading regardless of success or failure
    }
});