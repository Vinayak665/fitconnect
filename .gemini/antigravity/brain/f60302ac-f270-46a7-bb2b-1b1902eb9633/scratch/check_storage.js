const supabase = require('c:\\Users\\vinay\\OneDrive\\Desktop\\1\\database.js');

async function checkStorage() {
    console.log('Checking Supabase Storage...');
    try {
        const { data, error } = await supabase.storage.listBuckets();
        
        if (error) {
            console.error('Error listing buckets:', error);
            return;
        }
        
        console.log('Buckets found:', data.map(b => b.name));
        
        const avatarsBucket = data.find(b => b.name === 'avatars');
        if (!avatarsBucket) {
            console.error('CRITICAL: "avatars" bucket NOT FOUND in Supabase!');
        } else {
            console.log('"avatars" bucket exists. Public:', avatarsBucket.public);
        }
    } catch (err) {
        console.error('Catch error:', err.message);
    }
}

checkStorage();
