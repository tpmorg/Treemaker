import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';
import type { Media } from '$lib/types';

export const POST: RequestHandler = async ({ request, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await request.json();
        
        // Validate required fields
        if (!data.url) {
            return json({ success: false, error: 'Media URL is required' }, { status: 400 });
        }
        
        if (!data.type) {
            return json({ success: false, error: 'Media type is required' }, { status: 400 });
        }
        
        if (!data.personId) {
            return json({ success: false, error: 'Person ID is required' }, { status: 400 });
        }
        
        // Verify the person exists and belongs to a tree owned by the user
        const person = await prisma.person.findFirst({
            where: {
                id: data.personId,
                tree: {
                    ownerId: locals.user.id
                }
            },
            include: {
                tree: true
            }
        });
        
        if (!person) {
            return json({ success: false, error: 'Person not found or access denied' }, { status: 404 });
        }
        
        // Create the media
        const media = await prisma.media.create({
            data: {
                url: data.url,
                type: data.type,
                title: data.title || null,
                description: data.description || null,
                personId: data.personId,
                layoutId: data.layoutId || null
            }
        });
        
        return json({ 
            success: true, 
            media: {
                id: media.id,
                url: media.url,
                type: media.type,
                title: media.title,
                description: media.description,
                personId: media.personId,
                layoutId: media.layoutId,
                createdAt: media.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating media:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// Get all media for a specific person
export const GET: RequestHandler = async ({ url, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const personId = url.searchParams.get('personId');
        
        if (!personId) {
            return json({ success: false, error: 'Person ID is required' }, { status: 400 });
        }
        
        // Verify the person exists and belongs to a tree owned by the user
        const person = await prisma.person.findFirst({
            where: {
                id: personId,
                tree: {
                    ownerId: locals.user.id
                }
            }
        });
        
        if (!person) {
            return json({ success: false, error: 'Person not found or access denied' }, { status: 404 });
        }
        
        // Get all media for the person
        const mediaItems = await prisma.media.findMany({
            where: {
                personId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        return json({ success: true, media: mediaItems });
    } catch (error) {
        console.error('Error fetching media:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};