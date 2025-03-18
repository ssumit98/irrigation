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

    try {
        // Get location first
        await getLocation();

        // Get form values
        const name = document.getElementById('name').value;
        const inTime = document.getElementById('inTime').value;
        const outTime = document.getElementById('outTime').value;
        const photoFile = document.getElementById('photo').files[0];

        // Upload photo to Cloudinary
        const photoUrl = await uploadToCloudinary(photoFile);

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
        const scriptURL = 'https://script.google.com/macros/s/AKfycbzT9Yrz_Yjb1modQfPGrQSVwCt1NcQXfKHN_5z5eKivbkDOc_3Eu_EkQjFYr75CZiv3/exec';
        
        // Show loading state
        const submitButton = document.querySelector('.submit-btn');
        submitButton.textContent = 'Submitting...';
        submitButton.disabled = true;

        try {
            // Convert form data to URL encoded string
            const urlEncodedData = new URLSearchParams(formData).toString();
            
            // Create a hidden form and submit it
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = scriptURL;
            
            // Add the data as a hidden input
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = 'data';
            hiddenField.value = JSON.stringify(formData);
            form.appendChild(hiddenField);
            
            document.body.appendChild(form);
            form.submit();
            
            // Clean up the form
            document.body.removeChild(form);
            
            console.log('Form submitted to Google Sheets');
            alert('Form submitted successfully!');
            this.reset();
            imagePreview.style.display = 'none';
        } catch (error) {
            console.error('Error submitting to Google Sheets:', error);
            alert('Error submitting form. Please try again.');
        } finally {
            // Reset button state
            submitButton.textContent = 'Submit';
            submitButton.disabled = false;
        }

    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error submitting form. Please try again.');
    }
}); 