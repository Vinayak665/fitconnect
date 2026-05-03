const supabase = require('../database');
const path = require('path');

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'avatars';

/**
 * Uploads a file buffer to Supabase Storage
 * @param {Buffer} buffer - The file buffer
 * @param {string} originalname - The original file name
 * @param {string} mimetype - The file mimetype
 * @returns {Promise<string|null>} - The public URL of the uploaded file or null if failed
 */
async function uploadToSupabase(buffer, originalname, mimetype) {
    if (!buffer) return null;

    try {
        const ext = path.extname(originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `avatar-${uniqueSuffix}${ext}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filename, buffer, {
                contentType: mimetype,
                upsert: false
            });

        if (error) {
            if (error.message && error.message.includes('bucket not found')) {
                console.error(`❌ CRITICAL ERROR: Supabase bucket "${BUCKET_NAME}" not found. Please create it in your Supabase dashboard and set it to public.`);
            } else if (error.message && error.message.includes('row-level security policy')) {
                console.error(`❌ PERMISSION ERROR: Supabase Storage RLS policy violation. You must add a policy to the "${BUCKET_NAME}" bucket to allow uploads.`);
            } else {
                console.error('Supabase Storage Upload Error:', error);
            }
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filename);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('Error in uploadToSupabase:', err);
        return null;
    }
}

module.exports = {
    uploadToSupabase
};
