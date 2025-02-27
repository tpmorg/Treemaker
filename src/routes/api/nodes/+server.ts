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

// Create a new node for visual positioning
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
        
        // Remove legacy 'type' field if present - schema no longer contains it
        if (data.type) {
            delete data.type;
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
        
        // Create the node with visual positioning information
        const node = await prisma.node.create({
            data: {
                personId: data.personId,
                treeId: data.treeId,
                x: data.x !== undefined ? parseFloat(String(data.x)) : null,
                y: data.y !== undefined ? parseFloat(String(data.y)) : null
            }
        });
        
        // If creating a parent-child or sibling relationship, also create the family relation
        if (data.relationType && data.relatedToPersonId) {
            if (data.relationType === 'PARENT') {
                // Create parent-child relationship (current person is the parent)
                await prisma.familyRelation.create({
                    data: {
                        parentId: data.personId,
                        childId: data.relatedToPersonId,
                        relationType: data.subType || 'BIOLOGICAL',
                        treeId: data.treeId
                    }
                });
            } else if (data.relationType === 'CHILD') {
                // Create child-parent relationship (current person is the child)
                await prisma.familyRelation.create({
                    data: {
                        parentId: data.relatedToPersonId,
                        childId: data.personId,
                        relationType: data.subType || 'BIOLOGICAL',
                        treeId: data.treeId
                    }
                });
            } else if (data.relationType === 'SIBLING' || data.relationType === 'SPOUSE') {
                // Create sibling or spouse relationship
                await prisma.relationship.create({
                    data: {
                        fromPersonId: data.personId,
                        toPersonId: data.relatedToPersonId,
                        type: data.relationType,
                        subtype: data.subType,
                        treeId: data.treeId
                    }
                });
            }
        }
        
        return json({ 
            success: true, 
            node: {
                id: node.id,
                personId: node.personId,
                treeId: node.treeId,
                x: node.x,
                y: node.y,
                createdAt: node.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating node:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// Update a node (visual position only)
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
        
        // Update only the visual position of the node
        const node = await prisma.node.update({
            where: { id: data.nodeId },
            data: {
                x: data.x !== undefined ? parseFloat(data.x) : undefined,
                y: data.y !== undefined ? parseFloat(data.y) : undefined
            }
        });
        
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