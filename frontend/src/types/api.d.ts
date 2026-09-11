export interface Api {
  homes: {
    create: (name: string) => Promise<{ id: number; name: string }>;
    list: () => Promise<any[]>;
    delete: (homeId: number) => Promise<{ success: true }>;
  };
  rooms: {
    create: (
      homeId: number | string,
      body: { name: string; width?: number; height?: number; pos_x?: number; pos_y?: number }
    ) => Promise<{ id: number; home_id: number | string; name: string }>;
    getByHome: (homeId: number | string) => Promise<any[]>;
    getLayout: (homeId: number | string) => Promise<any[]>;
    updatePosition: (roomId: number, body: { pos_x: number; pos_y: number }) => Promise<{ success: true }>;
    updateSize: (roomId: number, body: { width: number; height: number }) => Promise<{ success: true }>;
    delete: (roomId: number) => Promise<{ success: true }>;
  };
  zones: {
    create: (
      roomId: number,
      body: {
        name: string;
        type?: string;
        width?: number;
        height?: number;
        pos_x?: number;
        pos_y?: number;
        attributes?: Record<string, unknown>;
      }
    ) => Promise<{ id: number; room_id: number; name: string; type?: string }>;
    getByRoom: (roomId: number) => Promise<any[]>;
    update: (
      zoneId: number,
      body: { name: string; type: string; attributes?: Record<string, unknown> }
    ) => Promise<{ success: true }>;
    updatePosition: (zoneId: number, body: { pos_x: number; pos_y: number }) => Promise<{ success: true }>;
    delete: (zoneId: number) => Promise<{ success: true }>;
  };
  items: {
    create: (
      zoneId: number,
      body: { name: string; description?: string; quantity?: number }
    ) => Promise<{ id: number; zone_id: number; name: string }>;
    getByZone: (zoneId: number) => Promise<any[]>;
    update: (itemId: number, body: { name: string; quantity: number }) => Promise<{ success: true }>;
    pack: (itemId: number, body: { box_id: number }) => Promise<{ success: true }>;
    unpack: (itemId: number, body: { zone_id: number }) => Promise<{ success: true }>;
    delete: (itemId: number) => Promise<{ success: true }>;
  };
  moveBoxes: {
    create: (body: { name: string }) => Promise<{ id: number; name: string; status: 'packing' }>;
    list: () => Promise<any[]>;
    complete: (boxId: number) => Promise<{ success: true }>;
    delete: (boxId: number) => Promise<{ success: true }>;
  };
  search: {
    items: (query: string) => Promise<{ results: any[] }>;
  };
}

declare global {
  interface Window {
    api: Api;
  }
}
