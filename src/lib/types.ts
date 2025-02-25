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
  createdAt: string;
  updatedAt?: string;
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
  type: string;
  personId: string;
  treeId: string;
  position?: string;
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