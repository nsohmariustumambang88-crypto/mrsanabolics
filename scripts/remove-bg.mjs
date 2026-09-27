import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

const API_KEY = 'Boqi8AWGTa83xmPFBAQKDXH1';
const inputPath = 'public/hero-bg.jfif';
const outputPath = 'public/hero-bg-no-bg.png';

async function removeBackground() {
  try {
    console.log('🔄 Removing background from hero image...');

    // Create form data with the image
    const form = new FormData();
    form.append('image_file', fs.createReadStream(inputPath));
    form.append('size', 'auto');
    form.append('format', 'png');

    // Call remove.bg API
    const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
      headers: {
        ...form.getHeaders(),
        'X-Api-Key': API_KEY,
      },
      responseType: 'arraybuffer',
    });

    // Save the result
    fs.writeFileSync(outputPath, response.data);
    const fileSize = fs.statSync(outputPath).size;

    console.log(`✅ Background removed successfully!`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`📊 File size: ${(fileSize / 1024).toFixed(1)} KB`);
    console.log(`\n✨ Ready to test on your hero section!`);

  } catch (error) {
    if (error.response?.status === 403) {
      console.error('❌ API Key Error: Invalid or expired API key');
    } else if (error.response?.status === 402) {
      console.error('❌ Quota Error: You\'ve used all your free API calls this month');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    process.exit(1);
  }
}

removeBackground();
