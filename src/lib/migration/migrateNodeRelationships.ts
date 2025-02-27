/**
 * Migration script to convert existing Node relationships to the new 
 * FamilyRelation and Relationship models
 */
import { prisma } from '$lib/server/prismaservice';

export async function migrateNodeRelationships() {
    console.log('Starting migration of Node relationships...');
    
    try {
        // Get all nodes
        const nodes = await prisma.node.findMany({
            include: {
                person: true,
                tree: true
            }
        });
        
        console.log(`Found ${nodes.length} nodes to process.`);
        
        // Process each node
        for (const node of nodes) {
            try {
                // Skip nodes without positions (they may be new format already)
                if (\!node.position) continue;
                
                // Parse position data which may contain relationship info
                let positionData: any = {};
                try {
                    positionData = JSON.parse(node.position);
                } catch (e) {
                    console.error(`Failed to parse position data for node ${node.id}:`, e);
                    continue;
                }
                
                // Extract x and y coordinates for visual positioning
                const x = typeof positionData.x === 'number' ? positionData.x : null;
                const y = typeof positionData.y === 'number' ? positionData.y : null;
                
                // Update the node with the new coordinate format
                await prisma.node.update({
                    where: { id: node.id },
                    data: {
                        x,
                        y
                    }
                });
                
                // Skip nodes without related nodes or type data
                if (\!positionData.relatedToNodeId || \!node.type) continue;
                
                // Get the related node and person
                const relatedNode = await prisma.node.findUnique({
                    where: { id: positionData.relatedToNodeId },
                    include: { person: true }
                });
                
                if (\!relatedNode) continue;
                
                // Create appropriate relationships based on the node type
                switch (node.type.toUpperCase()) {
                    case 'PARENT':
                        await prisma.familyRelation.create({
                            data: {
                                parentId: node.personId,
                                childId: relatedNode.personId,
                                relationType: 'BIOLOGICAL', // Default relationship type
                                treeId: node.treeId
                            }
                        });
                        console.log(`Created parent-child relation between ${node.personId} and ${relatedNode.personId}`);
                        break;
                        
                    case 'CHILD':
                        await prisma.familyRelation.create({
                            data: {
                                parentId: relatedNode.personId,
                                childId: node.personId,
                                relationType: 'BIOLOGICAL', // Default relationship type
                                treeId: node.treeId
                            }
                        });
                        console.log(`Created child-parent relation between ${node.personId} and ${relatedNode.personId}`);
                        break;
                        
                    case 'SIBLING':
                        await prisma.relationship.create({
                            data: {
                                fromPersonId: node.personId,
                                toPersonId: relatedNode.personId,
                                type: 'SIBLING',
                                treeId: node.treeId
                            }
                        });
                        console.log(`Created sibling relation between ${node.personId} and ${relatedNode.personId}`);
                        break;
                        
                    case 'SPOUSE':
                        await prisma.relationship.create({
                            data: {
                                fromPersonId: node.personId,
                                toPersonId: relatedNode.personId,
                                type: 'SPOUSE',
                                treeId: node.treeId
                            }
                        });
                        console.log(`Created spouse relation between ${node.personId} and ${relatedNode.personId}`);
                        break;
                    
                    default:
                        console.log(`Skipping node ${node.id} with unknown type: ${node.type}`);
                }
            } catch (nodeError) {
                console.error(`Error processing node ${node.id}:`, nodeError);
            }
        }
        
        console.log('Migration completed successfully\!');
        return { success: true, message: 'Migration completed successfully\!' };
    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, error: String(error) };
    }
}

// Function to run the migration from an API endpoint or script
export async function runMigration() {
    return await migrateNodeRelationships();
}
