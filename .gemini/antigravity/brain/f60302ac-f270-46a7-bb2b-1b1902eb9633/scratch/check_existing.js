const supabase = require('c:\\Users\\vinay\\OneDrive\\Desktop\\1\\database.js');

async function checkExistingImages() {
    console.log('Checking for existing profile images...');
    try {
        const { data, error } = await supabase
            .from('trainers')
            .select('name, profile_image')
            .not('profile_image', 'is', null)
            .limit(10);
        
        if (error) {
            console.error('Error:', error);
            return;
        }
        
        console.log('Trainers with images:', data);
    } catch (err) {
        console.error('Catch error:', err.message);
    }
}

checkExistingImages();
