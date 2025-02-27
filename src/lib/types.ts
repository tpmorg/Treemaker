/**
 * Core application types
 */

export interface Tree {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName?: string;
  birthDate?: string;
  deathDate?: string;
  gender?: string;
  notes?: string;
  treeId: string;
  userId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
}

export interface Media {
  id: string;
  url: string;
  type: string;
  title?: string;
  description?: string;
  personId: string;
  layoutId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Node {
  id: string;
  personId: string;
  treeId: string;
  x?: number;
  y?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Layout {
  id: string;
  name: string;
  type: string;
  config: string;
  isDefault: boolean;
  treeId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FamilyRelation {
  id: string;
  parentId: string;
  childId: string;
  relationType: 'BIOLOGICAL' | 'ADOPTIVE' | 'STEP' | 'FOSTER';
  treeId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Relationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: 'SPOUSE' | 'SIBLING';
  subtype?: 'HALF_SIBLING' | 'STEP_SIBLING' | null;
  startDate?: string;
  endDate?: string;
  treeId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonWithRelationships extends Person {
  parents?: Person[];
  children?: Person[];
  siblings?: Person[];
  spouses?: Person[];
}