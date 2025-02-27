/**
 * Service for handling family tree operations with the new relationship model
 */
import type { FamilyRelation, Person, PersonWithRelationships, Relationship } from '$lib/types';

export class FamilyTreeService {
    /**
     * Fetch a person with all their family relationships
     */
    static async getPersonWithFamily(personId: string): Promise<PersonWithRelationships | null> {
        try {
            const response = await fetch(`/api/people/family?personId=${personId}`);
            const result = await response.json();
            
            if (result.success) {
                return result.person;
            }
            
            console.error('Error fetching person family:', result.error);
            return null;
        } catch (error) {
            console.error('Error in getPersonWithFamily:', error);
            return null;
        }
    }
    
    /**
     * Create a parent-child relationship
     */
    static async createParentChildRelation(
        parentId: string, 
        childId: string, 
        treeId: string,
        relationType: 'BIOLOGICAL' | 'ADOPTIVE' | 'STEP' | 'FOSTER' = 'BIOLOGICAL'
    ): Promise<FamilyRelation | null> {
        try {
            const response = await fetch('/api/family-relations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parentId,
                    childId,
                    treeId,
                    relationType
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                return result.relation;
            }
            
            console.error('Error creating parent-child relation:', result.error);
            return null;
        } catch (error) {
            console.error('Error in createParentChildRelation:', error);
            return null;
        }
    }
    
    /**
     * Create a sibling or spouse relationship
     */
    static async createRelationship(
        fromPersonId: string,
        toPersonId: string,
        treeId: string,
        type: 'SPOUSE' | 'SIBLING',
        subtype?: string,
        startDate?: string,
        endDate?: string
    ): Promise<Relationship | null> {
        try {
            const response = await fetch('/api/relationships', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fromPersonId,
                    toPersonId,
                    treeId,
                    type,
                    subtype,
                    startDate,
                    endDate
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                return result.relationship;
            }
            
            console.error('Error creating relationship:', result.error);
            return null;
        } catch (error) {
            console.error('Error in createRelationship:', error);
            return null;
        }
    }
    
    /**
     * Determine the relationship type between two people
     */
    static async getRelationshipType(
        person1Id: string,
        person2Id: string
    ): Promise<{ type: string; subtype?: string } | null> {
        // First, check if there's a direct parent-child relationship
        const person1 = await this.getPersonWithFamily(person1Id);
        if (!person1) return null;
        
        // Check if person2 is a parent of person1
        const isParent = person1.parents?.some(parent => parent.id === person2Id);
        if (isParent) {
            const parent = person1.parents?.find(p => p.id === person2Id);
            return {
                type: 'CHILD_OF',
                subtype: parent?.relationType
            };
        }
        
        // Check if person2 is a child of person1
        const isChild = person1.children?.some(child => child.id === person2Id);
        if (isChild) {
            const child = person1.children?.find(c => c.id === person2Id);
            return {
                type: 'PARENT_OF',
                subtype: child?.relationType
            };
        }
        
        // Check if person2 is a sibling of person1
        const isSibling = person1.siblings?.some(sibling => sibling.id === person2Id);
        if (isSibling) {
            const sibling = person1.siblings?.find(s => s.id === person2Id);
            return {
                type: 'SIBLING',
                subtype: sibling?.relationType
            };
        }
        
        // Check if person2 is a spouse of person1
        const isSpouse = person1.spouses?.some(spouse => spouse.id === person2Id);
        if (isSpouse) {
            return { type: 'SPOUSE' };
        }
        
        // No direct relationship found
        return null;
    }
    
    /**
     * Get a visual representation of the family tree starting from a given person
     */
    static async getFamilyTree(rootPersonId: string, treeId: string): Promise<any> {
        try {
            // Get the root person with all their family relationships
            const rootPerson = await this.getPersonWithFamily(rootPersonId);
            if (!rootPerson) return null;
            
            // Start building the tree
            const tree = {
                person: rootPerson,
                parents: [],
                children: [],
                siblings: [],
                spouses: []
            };
            
            // Fetch first-degree relatives
            if (rootPerson.parents && rootPerson.parents.length > 0) {
                tree.parents = rootPerson.parents.map(parent => ({
                    person: parent,
                    relationType: parent.relationType
                }));
            }
            
            if (rootPerson.children && rootPerson.children.length > 0) {
                tree.children = rootPerson.children.map(child => ({
                    person: child,
                    relationType: child.relationType
                }));
            }
            
            if (rootPerson.siblings && rootPerson.siblings.length > 0) {
                tree.siblings = rootPerson.siblings.map(sibling => ({
                    person: sibling,
                    relationType: sibling.relationType
                }));
            }
            
            if (rootPerson.spouses && rootPerson.spouses.length > 0) {
                tree.spouses = rootPerson.spouses.map(spouse => ({
                    person: spouse,
                    startDate: spouse.startDate,
                    endDate: spouse.endDate
                }));
            }
            
            return tree;
        } catch (error) {
            console.error('Error in getFamilyTree:', error);
            return null;
        }
    }
}