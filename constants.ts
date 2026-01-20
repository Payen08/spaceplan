import { FurnitureType, FurnitureItem } from './types';

// Scale: 1 meter = 100 pixels on screen
export const PIXELS_PER_METER = 80;

export const DEFAULT_ROOM_DIMS = {
  width: 4.5,
  length: 5.0,
};

export const FURNITURE_PRESETS: Partial<FurnitureItem>[] = [
  {
    name: '吸顶灯',
    type: FurnitureType.LIGHT,
    width: 0.5,
    depth: 0.5,
    color: '#fde047', // yellow-300
    lightRange: 3.0,
  },
  {
    name: '筒灯',
    type: FurnitureType.LIGHT,
    width: 0.15,
    depth: 0.15,
    color: '#fef08a', // yellow-200
    lightRange: 1.5,
  },
  {
    name: '落地灯',
    type: FurnitureType.LIGHT,
    width: 0.4,
    depth: 0.4,
    color: '#fef08a', // yellow-200
    lightRange: 2.0,
  },
  {
    name: '单人床',
    type: FurnitureType.BED,
    width: 1.0,
    depth: 2.0,
    color: '#93c5fd', // blue-300
  },
  {
    name: '双人床',
    type: FurnitureType.BED,
    width: 1.5,
    depth: 2.0,
    color: '#60a5fa', // blue-400
  },
  {
    name: '书桌',
    type: FurnitureType.TABLE,
    width: 1.2,
    depth: 0.6,
    color: '#d8b4fe', // purple-300
  },
  {
    name: '办公椅',
    type: FurnitureType.CHAIR,
    width: 0.5,
    depth: 0.5,
    color: '#fca5a5', // red-300
  },
  {
    name: '三人沙发',
    type: FurnitureType.SOFA,
    width: 2.2,
    depth: 0.9,
    color: '#86efac', // green-300
  },
  {
    name: '衣柜',
    type: FurnitureType.WARDROBE,
    width: 1.5,
    depth: 0.6,
    color: '#fdba74', // orange-300
  },
  {
    name: '餐桌',
    type: FurnitureType.TABLE,
    width: 1.8,
    depth: 0.9,
    color: '#f0abfc', // fuchsia-300
  },
  {
    name: '门',
    type: FurnitureType.DOOR,
    width: 0.9,
    depth: 0.15,
    color: '#cbd5e1', // slate-300
  },
];

export const ROOM_TYPES = [
  '卧室',
  '客厅',
  '书房',
  '厨房',
  '单身公寓',
  '会议室'
];