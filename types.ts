export interface Dimensions {
  width: number; // in meters
  length: number; // in meters
}

export interface FurnitureItem {
  id: string;
  name: string;
  type: FurnitureType;
  x: number; // meters from left
  y: number; // meters from top
  width: number; // meters
  depth: number; // meters
  rotation: number; // degrees
  color: string;
  locked?: boolean; // New property for locking position
  lightRange?: number; // New property: Light illumination radius in meters
}

export enum FurnitureType {
  BED = 'BED',
  TABLE = 'TABLE',
  CHAIR = 'CHAIR',
  SOFA = 'SOFA',
  WARDROBE = 'WARDROBE',
  CUSTOM = 'CUSTOM',
  DOOR = 'DOOR',
  WINDOW = 'WINDOW',
  LIGHT = 'LIGHT'
}

export interface RoomConfig {
  roomName: string;
  dimensions: Dimensions;
  items: FurnitureItem[];
}

export type AISuggestionRequest = {
  roomType: string;
  width: number;
  length: number;
  requirements: string;
};