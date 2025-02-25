import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '$lib/server/cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});

export const POST: RequestHandler = async ({ request, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Check if the request is multipart/form-data
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return json({ success: false, error: 'Invalid request format' }, { status: 400 });
        }

        // Parse the form data
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // Convert File to buffer for Cloudinary upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'treemaker',
                    resource_type: 'auto'
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            // Write buffer to stream
            uploadStream.write(buffer);
            uploadStream.end();
        });

        // Return the Cloudinary URL
        return json({
            success: true,
            url: (uploadResult as any).secure_url,
            publicId: (uploadResult as any).public_id
        });
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};