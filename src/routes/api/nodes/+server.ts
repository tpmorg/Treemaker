import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/prismaservice';
import type { Node } from '$lib/types';

// Get all nodes for a specific tree
export const GET: RequestHandler = async ({ url, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const treeId = url.searchParams.get('treeId');
        
        if (!treeId) {
            return json({ success: false, error: 'Tree ID is required' }, { status: 400 });
        }
        
        // Verify the tree exists and belongs to the user
        const tree = await prisma.tree.findUnique({
            where: {
                id: treeId,
                ownerId: locals.user.id
            }
        });
        
        if (!tree) {
            return json({ success: false, error: 'Tree not found or access denied' }, { status: 404 });
        }
        
        // Get all nodes for the tree
        const nodes = await prisma.node.findMany({
            where: {
                treeId
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        
        return json({ success: true, nodes });
    } catch (error) {
        console.error('Error fetching nodes:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// Create a new node and establish relationships
export const POST: RequestHandler = async ({ request, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await request.json();
        
        // Validate required fields
        if (!data.personId) {
            return json({ success: false, error: 'Person ID is required' }, { status: 400 });
        }
        
        if (!data.treeId) {
            return json({ success: false, error: 'Tree ID is required' }, { status: 400 });
        }
        
        if (!data.type) {
            return json({ success: false, error: 'Node type is required' }, { status: 400 });
        }
        
        // Verify the tree exists and belongs to the user
        const tree = await prisma.tree.findUnique({
            where: {
                id: data.treeId,
                ownerId: locals.user.id
            }
        });
        
        if (!tree) {
            return json({ success: false, error: 'Tree not found or access denied' }, { status: 404 });
        }
        
        // Verify the person exists and belongs to the specified tree
        const person = await prisma.person.findUnique({
            where: {
                id: data.personId,
                treeId: data.treeId
            }
        });
        
        if (!person) {
            return json({ success: false, error: 'Person not found or does not belong to the tree' }, { status: 404 });
        }
        
        // Create the node
        const node = await prisma.node.create({
            data: {
                type: data.type,
                personId: data.personId,
                treeId: data.treeId,
                position: data.position || undefined
            }
        });
        
        // Create relationships if specified
        if (data.relatedToNodeId) {
            // Create the relationship between nodes
            // Note: This code assumes your Node model allows for relationships between nodes
            // You might need to adjust this based on your actual database model
            
            // Example: Relate this node to another node (e.g., child to parent)
            await prisma.node.update({
                where: { id: node.id },
                data: {
                    relatedTo: {
                        connect: { id: data.relatedToNodeId }
                    }
                }
            });
        }
        
        return json({ 
            success: true, 
            node: {
                id: node.id,
                type: node.type,
                personId: node.personId,
                treeId: node.treeId,
                position: node.position,
                createdAt: node.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating node:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// Update a node
export const PATCH: RequestHandler = async ({ request, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await request.json();
        
        // Validate required fields
        if (!data.nodeId) {
            return json({ success: false, error: 'Node ID is required' }, { status: 400 });
        }
        
        // Get the node
        const existingNode = await prisma.node.findUnique({
            where: { id: data.nodeId },
            include: { tree: true }
        });
        
        if (!existingNode) {
            return json({ success: false, error: 'Node not found' }, { status: 404 });
        }
        
        // Verify the user owns the tree this node belongs to
        if (existingNode.tree.ownerId !== locals.user.id) {
            return json({ success: false, error: 'Access denied' }, { status: 403 });
        }
        
        // Update the node
        const node = await prisma.node.update({
            where: { id: data.nodeId },
            data: {
                type: data.type || undefined,
                position: data.position || undefined
            }
        });
        
        // Update relationships if specified
        if (data.addRelatedToNodeId) {
            await prisma.node.update({
                where: { id: node.id },
                data: {
                    relatedTo: {
                        connect: { id: data.addRelatedToNodeId }
                    }
                }
            });
        }
        
        if (data.removeRelatedToNodeId) {
            await prisma.node.update({
                where: { id: node.id },
                data: {
                    relatedTo: {
                        disconnect: { id: data.removeRelatedToNodeId }
                    }
                }
            });
        }
        
        return json({ success: true, node });
    } catch (error) {
        console.error('Error updating node:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// Delete a node
export const DELETE: RequestHandler = async ({ url, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const nodeId = url.searchParams.get('nodeId');
        
        if (!nodeId) {
            return json({ success: false, error: 'Node ID is required' }, { status: 400 });
        }
        
        // Get the node
        const node = await prisma.node.findUnique({
            where: { id: nodeId },
            include: { tree: true }
        });
        
        if (!node) {
            return json({ success: false, error: 'Node not found' }, { status: 404 });
        }
        
        // Verify the user owns the tree this node belongs to
        if (node.tree.ownerId !== locals.user.id) {
            return json({ success: false, error: 'Access denied' }, { status: 403 });
        }
        
        // Delete the node - relationships will be handled based on your Prisma schema settings
        await prisma.node.delete({
            where: { id: nodeId }
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Error deleting node:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};