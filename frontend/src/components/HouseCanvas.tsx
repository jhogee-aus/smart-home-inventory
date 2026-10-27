import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import API from '../services/api';
import FurnitureIcon from './FurnitureIcon';

// --- world <-> screen conversion -------------------------------------------
//
// Room (and zone) x/y have always been plain numbers with no transform
// applied - that's "world space". Previously the Stage itself had no pan/zoom
// (x=0, y=0, scale=1), so world space and screen space were the same thing by
// coincidence. Now the Stage has its own x/y/scale (the "camera"), so a point
// on screen and the same point in the room/zone data are no longer the same
// numbers - these two helpers convert between them given the current camera.
interface Viewport {
  x: number;
  y: number;
  scale: number;
}

function toWorld(screenPoint: { x: number; y: number }, viewport: Viewport) {
  return {
    x: (screenPoint.x - viewport.x) / viewport.scale,
    y: (screenPoint.y - viewport.y) / viewport.scale,
  };
}

function toScreen(worldPoint: { x: number; y: number }, viewport: Viewport) {
  return {
    x: worldPoint.x * viewport.scale + viewport.x,
    y: worldPoint.y * viewport.scale + viewport.y,
  };
}

export function isOverlapping(
  x: number,
  y: number,
  width: number,
  height: number,
  rooms: Room[],
  currentRoomId: number
) {
  return rooms.some(r => {
    if (r.id === currentRoomId) return false;

    return (
      x < r.pos_x + r.width / 2 &&
      x + width > r.pos_x &&
      y < r.pos_y + r.height / 2 &&
      y + height > r.pos_y
    );
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function isTypingTarget(el: Element | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

interface Zone {
  id: number;
  name: string;
  type: string;
  width: number;
  height: number;
  pos_x: number;
  pos_y: number;
  attributes?: { shelves?: number; drawers?: number };
}

interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
  pos_x: number;
  pos_y: number;
  zones: Zone[];
}

interface Props {
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  onEnterRoom: (roomId: number) => void;
}

export interface HouseCanvasHandle {
  /** World-space point currently at the centre of the visible viewport. */
  getViewportCenterWorld: () => { x: number; y: number };
  /** Pan/zoom so every room is framed in view, like Figma's "zoom to fit". */
  fitToScreen: () => void;
}

const MIN_ROOM_SIZE = 80;
const HANDLE_SIZE = 14;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
const ZOOM_STEP = 1.05;
const FIT_PADDING = 80;
const CANVAS_HEIGHT = 560;

function roomMinPixelSize(room: Room) {
  const zoneBoundW = Math.max(
    MIN_ROOM_SIZE,
    ...room.zones.map(z => z.pos_x + z.width)
  );
  const zoneBoundH = Math.max(
    MIN_ROOM_SIZE,
    ...room.zones.map(z => z.pos_y + z.height)
  );
  return { minW: zoneBoundW, minH: zoneBoundH };
}

const HouseCanvas = forwardRef<HouseCanvasHandle, Props>(function HouseCanvas(
  { rooms, setRooms, onEnterRoom },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [spacePressed, setSpacePressed] = useState(false);

  // Mutable, per-gesture tracking that must NOT trigger re-renders:
  // - spacePressedRef mirrors spacePressed for reads inside imperative handlers
  //   (those are registered once and would otherwise close over a stale value).
  // - panning/lastPointer track an in-progress manual pan.
  // - lastValidPos/Size remember each room's last non-overlapping position/size
  //   so dragBoundFunc can reject a move without ever calling setState.
  const spacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastValidPosRef = useRef(new Map<number, { x: number; y: number }>());
  const lastValidSizeRef = useRef(new Map<number, { w: number; h: number }>());
  const rectRefs = useRef(new Map<number, Konva.Rect>());

  // keep the "last known good" refs in sync whenever fresh data arrives
  // (after a fetch, a resize/move from elsewhere, etc).
  useEffect(() => {
    rooms.forEach(r => {
      lastValidPosRef.current.set(r.id, { x: r.pos_x, y: r.pos_y });
      lastValidSizeRef.current.set(r.id, { w: r.width / 2, h: r.height / 2 });
    });
  }, [rooms]);

  // measure the available width so the canvas fills its container; height is
  // fixed since panning (not page scrolling) is how you see more of the world.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.clientWidth);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Space-to-pan, ignored while typing anywhere in the app.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(document.activeElement)) return;
      e.preventDefault();
      if (!spacePressedRef.current) {
        spacePressedRef.current = true;
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spacePressedRef.current = false;
      setSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getViewportCenterWorld: () =>
        toWorld({ x: containerWidth / 2, y: CANVAS_HEIGHT / 2 }, viewport),

      fitToScreen: () => {
        if (rooms.length === 0) {
          setViewport({ x: 0, y: 0, scale: 1 });
          return;
        }

        const minX = Math.min(...rooms.map(r => r.pos_x));
        const minY = Math.min(...rooms.map(r => r.pos_y));
        const maxX = Math.max(...rooms.map(r => r.pos_x + r.width / 2));
        const maxY = Math.max(...rooms.map(r => r.pos_y + r.height / 2));

        const boundsW = Math.max(1, maxX - minX);
        const boundsH = Math.max(1, maxY - minY);

        const scale = clamp(
          Math.min(
            (containerWidth - FIT_PADDING * 2) / boundsW,
            (CANVAS_HEIGHT - FIT_PADDING * 2) / boundsH
          ),
          MIN_SCALE,
          MAX_SCALE
        );

        const centerX = minX + boundsW / 2;
        const centerY = minY + boundsH / 2;

        setViewport({
          x: containerWidth / 2 - centerX * scale,
          y: CANVAS_HEIGHT / 2 - centerY * scale,
          scale,
        });
      },
    }),
    [viewport, containerWidth, rooms]
  );

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;

    const oldScale = viewport.scale;
    const pointInWorld = toWorld(pointer, viewport);

    const zoomingIn = e.evt.deltaY < 0;
    const newScale = clamp(
      zoomingIn ? oldScale * ZOOM_STEP : oldScale / ZOOM_STEP,
      MIN_SCALE,
      MAX_SCALE
    );

    setViewport({
      scale: newScale,
      x: pointer.x - pointInWorld.x * newScale,
      y: pointer.y - pointInWorld.y * newScale,
    });
  };

  // Manual panning (not Konva's built-in Stage draggable) so that holding
  // Space pans even when the cursor is over a room - see the plain-English
  // writeup for why this needs to be manual rather than declarative.
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const clickedEmptyCanvas = e.target === stage;
    if (!clickedEmptyCanvas && !spacePressedRef.current) return;

    isPanningRef.current = true;
    lastPointerRef.current = stage.getPointerPosition();
    stage.container().style.cursor = 'grabbing';
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanningRef.current) return;

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    const last = lastPointerRef.current;
    if (!stage || !pointer || !last) return;

    // Imperative-only: move the stage directly and ask Konva to redraw,
    // without touching React state on every mouse-move frame.
    stage.position({ x: stage.x() + (pointer.x - last.x), y: stage.y() + (pointer.y - last.y) });
    stage.batchDraw();
    lastPointerRef.current = pointer;
  };

  const endPan = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanningRef.current) return;

    isPanningRef.current = false;
    lastPointerRef.current = null;

    const stage = e.target.getStage();
    if (!stage) return;

    stage.container().style.cursor = spacePressedRef.current ? 'grab' : 'default';
    // sync React state once, now that the gesture is over
    setViewport(v => ({ ...v, x: stage.x(), y: stage.y() }));
  };

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      style={{ height: CANVAS_HEIGHT, cursor: spacePressed ? 'grab' : 'default' }}
    >
      <Stage
        width={containerWidth}
        height={CANVAS_HEIGHT}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={endPan}
        onMouseLeave={endPan}
      >
        <Layer>
          {rooms.map(room => {
            const pixelW = room.width / 2;
            const pixelH = room.height / 2;

            return (
              <Group
                key={room.id}
                x={room.pos_x}
                y={room.pos_y}
                draggable={!spacePressed}
                dragBoundFunc={pos => {
                  // `pos` is in ABSOLUTE (stage-transformed) coordinates -
                  // convert to world space to check/clamp, then convert back.
                  const world = toWorld(pos, viewport);
                  const last = lastValidPosRef.current.get(room.id) ?? {
                    x: room.pos_x,
                    y: room.pos_y,
                  };

                  if (isOverlapping(world.x, world.y, pixelW, pixelH, rooms, room.id)) {
                    return toScreen(last, viewport);
                  }

                  lastValidPosRef.current.set(room.id, world);
                  return toScreen(world, viewport);
                }}
                onDragStart={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'grabbing';
                }}
                onDragEnd={async (e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'pointer';

                  // e.target.x()/y() are already world coordinates - dragBoundFunc
                  // only affects the absolute position Konva renders with, not
                  // what .position() reports back afterwards.
                  const newX = e.target.x();
                  const newY = e.target.y();

                  setRooms(prev =>
                    prev.map(r => (r.id === room.id ? { ...r, pos_x: newX, pos_y: newY } : r))
                  );

                  try {
                    await API.rooms.updatePosition(room.id, { pos_x: newX, pos_y: newY });
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                <Rect
                  ref={node => {
                    if (node) rectRefs.current.set(room.id, node);
                  }}
                  width={pixelW}
                  height={pixelH}
                  cornerRadius={6}
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  fill="#f8fafc"
                  shadowColor="#0f172a"
                  shadowOpacity={0.06}
                  shadowBlur={8}
                  shadowOffsetY={2}
                  onClick={() => onEnterRoom(room.id)}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                />

                <Text
                  x={8}
                  y={-22}
                  text={room.name}
                  fontSize={15}
                  fontStyle="600"
                  fill="#334155"
                  listening={false}
                />

                {/* ZONE PREVIEW (static, non-interactive) */}
                {room.zones.map(zone => (
                  <Group key={zone.id} x={zone.pos_x} y={zone.pos_y} listening={false}>
                    <Rect
                      width={zone.width}
                      height={zone.height}
                      cornerRadius={4}
                      fill="#bfdbfe"
                      stroke="#60a5fa"
                      strokeWidth={1}
                      listening={false}
                    />
                    <FurnitureIcon
                      type={zone.type}
                      width={zone.width}
                      height={zone.height}
                      attributes={zone.attributes}
                    />
                    <Text
                      x={5}
                      y={5}
                      text={zone.name}
                      fontSize={10}
                      fill="#1e3a8a"
                      listening={false}
                    />
                  </Group>
                ))}

                {/* RESIZE HANDLE */}
                <Rect
                  x={pixelW - HANDLE_SIZE}
                  y={pixelH - HANDLE_SIZE}
                  width={HANDLE_SIZE}
                  height={HANDLE_SIZE}
                  cornerRadius={3}
                  fill="#94a3b8"
                  draggable={!spacePressed}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'nwse-resize';
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                  onDragStart={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'nwse-resize';
                  }}
                  dragBoundFunc={pos => {
                    // Same absolute -> world conversion, then un-translate by
                    // the room's own origin to get a size (room-local) delta.
                    const world = toWorld(pos, viewport);
                    const roomLocal = { x: world.x - room.pos_x, y: world.y - room.pos_y };

                    const { minW, minH } = roomMinPixelSize(room);
                    let newPixelW = Math.max(minW, roomLocal.x + HANDLE_SIZE);
                    let newPixelH = Math.max(minH, roomLocal.y + HANDLE_SIZE);

                    if (isOverlapping(room.pos_x, room.pos_y, newPixelW, newPixelH, rooms, room.id)) {
                      const last = lastValidSizeRef.current.get(room.id) ?? {
                        w: pixelW,
                        h: pixelH,
                      };
                      newPixelW = last.w;
                      newPixelH = last.h;
                    } else {
                      lastValidSizeRef.current.set(room.id, { w: newPixelW, h: newPixelH });
                    }

                    // Live-resize the room body imperatively - no setState,
                    // just a direct Konva mutation plus a redraw.
                    const rect = rectRefs.current.get(room.id);
                    if (rect) {
                      rect.width(newPixelW);
                      rect.height(newPixelH);
                      rect.getLayer()?.batchDraw();
                    }

                    const newWorld = {
                      x: room.pos_x + newPixelW - HANDLE_SIZE,
                      y: room.pos_y + newPixelH - HANDLE_SIZE,
                    };
                    return toScreen(newWorld, viewport);
                  }}
                  onDragEnd={async (e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';

                    const finalSize = lastValidSizeRef.current.get(room.id) ?? {
                      w: pixelW,
                      h: pixelH,
                    };

                    setRooms(prev =>
                      prev.map(r =>
                        r.id === room.id
                          ? { ...r, width: finalSize.w * 2, height: finalSize.h * 2 }
                          : r
                      )
                    );

                    try {
                      await API.rooms.updateSize(room.id, {
                        width: finalSize.w * 2,
                        height: finalSize.h * 2,
                      });
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
});

export default HouseCanvas;
