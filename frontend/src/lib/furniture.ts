export type AttributeKey = 'shelves' | 'drawers';

export interface FurnitureTypeDef {
  value: string;
  label: string;
  attribute: AttributeKey | null;
  attributeLabel?: string;
  defaultAttributeValue?: number;
}

export const FURNITURE_TYPES: FurnitureTypeDef[] = [
  { value: 'box', label: 'Generic Box', attribute: null },
  { value: 'cabinet', label: 'Cabinet', attribute: 'shelves', attributeLabel: 'Shelves', defaultAttributeValue: 3 },
  { value: 'shelf', label: 'Open Shelf', attribute: 'shelves', attributeLabel: 'Shelves', defaultAttributeValue: 3 },
  { value: 'wardrobe', label: 'Wardrobe', attribute: 'shelves', attributeLabel: 'Shelves', defaultAttributeValue: 2 },
  { value: 'drawer', label: 'Drawer Unit', attribute: 'drawers', attributeLabel: 'Drawers', defaultAttributeValue: 3 },
  { value: 'table', label: 'Table', attribute: 'drawers', attributeLabel: 'Drawers', defaultAttributeValue: 0 },
  { value: 'bed', label: 'Bed', attribute: null },
  { value: 'sofa', label: 'Sofa', attribute: null },
];

export function furnitureDef(type: string): FurnitureTypeDef {
  return FURNITURE_TYPES.find(f => f.value === type) || FURNITURE_TYPES[0];
}

export function furnitureLabel(type: string): string {
  return furnitureDef(type).label;
}
