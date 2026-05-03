const supabase = require('c:\\Users\\vinay\\OneDrive\\Desktop\\1\\database.js');

async function createBucket() {
    console.log('Attempting to create "avatars" bucket...');
    try {
        const { data, error } = await supabase.storage.createBucket('avatars', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
            fileSizeLimit: 5242880 // 5MB
        });
        
        if (error) {
            console.error('Error creating bucket:', error);
            if (error.message.includes('already exists')) {
                console.log('Bucket already exists, making it public...');
                await supabase.storage.updateBucket('avatars', { public: true });
            }
            return;
        }
        
        console.log('Bucket created successfully:', data);
    } catch (err) {
        console.error('Catch error:', err.message);
    }
}

createBucket();
