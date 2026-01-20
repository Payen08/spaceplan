export interface Dimensions {
  width: number; // meters
  length: number; // meters
}

export interface FurnitureItem {
  id: string;
  name: string;
  type: FurnitureType;
  width: number; // meters
  depth: number; // meters
  x: number; // meters
  y: number; // meters
  rotation: number; // degrees
  color: string;
  locked?: boolean;
  lightRange?: number; // meters, for LIGHT type
}

export enum FurnitureType {
  BED = 'BED',
  SOFA = 'SOFA',
  TABLE = 'TABLE',
  CHAIR = 'CHAIR',
  WARDROBE = 'WARDROBE',
  DOOR = 'DOOR',
  LIGHT = 'LIGHT',
  CUSTOM = 'CUSTOM',
}

export interface Project {
  id: string;
  name: string;
  dimensions: Dimensions;
  items: FurnitureItem[];
  createdAt: number;
  updatedAt: number;
}