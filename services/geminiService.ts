import { GoogleGenAI, Type } from "@google/genai";
import { FurnitureItem, FurnitureType } from "../types";

const apiKey = process.env.API_KEY || '';

// We use the flash preview model for fast, structured JSON responses
const MODEL_NAME = 'gemini-3-flash-preview';

export const generateLayoutSuggestion = async (
  roomType: string,
  width: number,
  length: number,
  userDescription: string
): Promise<FurnitureItem[]> => {
  if (!apiKey) {
    console.warn("API Key is missing. Returning empty suggestion.");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    我有一个 ${roomType} (Room Type), 尺寸是 ${width}米 (宽) x ${length}米 (长)。
    用户需求: "${userDescription}".
    
    请生成一个家具布局列表。
    确保所有物品都在 ${width}x${length} 的范围内。
    如果合适，请包含灯光布置（Light）。
    
    常见家具尺寸参考 (米):
    - 床 (Bed): 1.5x2.0 或 1.0x2.0
    - 书桌 (Desk): 1.2x0.6
    - 椅子 (Chair): 0.5x0.5
    - 沙发 (Sofa): 2.0x0.9
    - 衣柜 (Wardrobe): 1.5x0.6
    - 吸顶灯 (Light): 0.4x0.4
    
    请返回一个 JSON 数组。
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "物品名称，请使用中文，例如 '双人床', '书桌', '吸顶灯'" },
              type: { 
                type: Type.STRING, 
                enum: Object.values(FurnitureType),
                description: "Type category of the furniture"
              },
              width: { type: Type.NUMBER, description: "Width in meters" },
              depth: { type: Type.NUMBER, description: "Depth in meters" },
              x: { type: Type.NUMBER, description: "X position in meters (from left)" },
              y: { type: Type.NUMBER, description: "Y position in meters (from top)" },
              rotation: { type: Type.NUMBER, description: "Rotation in degrees (usually 0, 90, 180, 270)" }
            },
            required: ["name", "type", "width", "depth", "x", "y", "rotation"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const rawItems = JSON.parse(jsonText);
    
    // Post-process to add IDs and colors (colors are UI specific)
    return rawItems.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      color: getColorForType(item.type)
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

const getColorForType = (type: string): string => {
  switch (type) {
    case FurnitureType.BED: return '#93c5fd';
    case FurnitureType.SOFA: return '#86efac';
    case FurnitureType.TABLE: return '#d8b4fe';
    case FurnitureType.WARDROBE: return '#fdba74';
    case FurnitureType.CHAIR: return '#fca5a5';
    case FurnitureType.DOOR: return '#cbd5e1';
    case FurnitureType.LIGHT: return '#fde047';
    default: return '#e2e8f0';
  }
};