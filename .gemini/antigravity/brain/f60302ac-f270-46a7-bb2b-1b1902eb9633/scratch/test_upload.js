const supabase = require('c:\\Users\\vinay\\OneDrive\\Desktop\\1\\database.js');

async function testUpload() {
    console.log('Testing upload to "avatars" bucket...');
    const buffer = Buffer.from('test');
    const filename = `test-${Date.now()}.txt`;
    
    try {
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filename, buffer, { contentType: 'text/plain' });
        
        if (error) {
            console.error('Upload failed:', error);
            if (error.message.includes('bucket not found')) {
                console.log('Confirmed: Bucket "avatars" is NOT FOUND in this project.');
            }
        } else {
            console.log('Upload successful!', data);
        }
    } catch (err) {
        console.error('Catch error:', err.message);
    }
}

testUpload();
