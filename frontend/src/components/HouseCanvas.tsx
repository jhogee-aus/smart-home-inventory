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
import {
  overlapsAny,
  resolveNonOverlapping as resolveAABBOverlap,
  resolveFreeDragEnd,
  type AABB,
} from '../lib/collision';
import { animatePositionTo } from '../lib/animate';
import { zoneLabelWidth, zoneLabelWrapProps } from '../lib/zoneLabel';

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

// Reserved space above every room for its name label. Folded into the
// collision bounds (both sides of a check) so two rooms can never end up
// close enough for one's label to run under its neighbour.
const LABEL_HEIGHT = 28;

function roomsExcept(rooms: Room[], currentRoomId: number): AABB[] {
  return rooms
    .filter(r => r.id !== currentRoomId)
    .map(r => ({ x: r.pos_x, y: r.pos_y, w: r.width / 2, h: r.height / 2 }));
}

export function isOverlapping(
  x: number,
  y: number,
  width: number,
  height: number,
  rooms: Room[],
  currentRoomId: number
) {
  return overlapsAny({ x, y, w: width, h: height }, roomsExcept(rooms, currentRoomId), LABEL_HEIGHT);
}

// Single collision rule shared by room dragging AND room resizing (and, via
// the same lib/collision helpers, by zones inside a room): if the desired
// rect would overlap another room (label included), fall back to the last
// known-good rect instead.
function resolveNonOverlapping(
  desired: { x: number; y: number; w: number; h: number },
  fallback: { x: number; y: number; w: number; h: number },
  rooms: Room[],
  currentRoomId: number
) {
  return resolveAABBOverlap(desired, fallback, roomsExcept(rooms, currentRoomId), LABEL_HEIGHT);
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
  /** Called whenever every room is (or stops being) fully inside the current viewport. */
  onVisibilityChange?: (allVisible: boolean) => void;
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

// Below this on-screen (scaled) size, a zone's name in the house-view
// minimap would be illegible even truncated - hide the label entirely
// rather than show unreadable text (the full name is still always
// visible/selectable in the room view itself).
const MIN_ZONE_LABEL_SCALED_WIDTH = 18;
const MIN_ZONE_LABEL_SCALED_HEIGHT = 10;

// A room's zone layout is its own independent space (see the zone preview
// below, which scales to fit rather than being clipped) - so a room's own
// minimum size no longer needs to leave room for its zones' real extent.
const ROOM_MIN_PIXEL_SIZE = { minW: MIN_ROOM_SIZE, minH: MIN_ROOM_SIZE };

// How the house view previews a room's zone layout: scaled down (never up)
// to always fit entirely inside the room's own card, like a minimap -
// "zoom out" to see everything at once, rather than clipping any of it
// away. Centred within the card with equal padding on both axes.
function computeZonePreview(zones: Zone[], pixelW: number, pixelH: number) {
  if (zones.length === 0) {
    return { scale: 1, offsetX: 0, offsetY: 0, boundsMinX: 0, boundsMinY: 0 };
  }

  const boundsMinX = Math.min(...zones.map(z => z.pos_x));
  const boundsMinY = Math.min(...zones.map(z => z.pos_y));
  const boundsMaxX = Math.max(...zones.map(z => z.pos_x + z.width));
  const boundsMaxY = Math.max(...zones.map(z => z.pos_y + z.height));
  const boundsW = Math.max(1, boundsMaxX - boundsMinX);
  const boundsH = Math.max(1, boundsMaxY - boundsMinY);

  const scale = Math.min(1, pixelW / boundsW, pixelH / boundsH);

  return {
    scale,
    offsetX: (pixelW - boundsW * scale) / 2,
    offsetY: (pixelH - boundsH * scale) / 2,
    boundsMinX,
    boundsMinY,
  };
}

// Shared by the imperative fitToScreen() handle and the auto-fit-on-mount
// effect, so both frame every room the same way ("zoom to fit").
function computeFitViewport(rooms: Room[], width: number): Viewport {
  if (rooms.length === 0) return { x: 0, y: 0, scale: 1 };

  const minX = Math.min(...rooms.map(r => r.pos_x));
  const minY = Math.min(...rooms.map(r => r.pos_y));
  const maxX = Math.max(...rooms.map(r => r.pos_x + r.width / 2));
  const maxY = Math.max(...rooms.map(r => r.pos_y + r.height / 2));

  const boundsW = Math.max(1, maxX - minX);
  const boundsH = Math.max(1, maxY - minY);

  const scale = clamp(
    Math.min(
      (width - FIT_PADDING * 2) / boundsW,
      (CANVAS_HEIGHT - FIT_PADDING * 2) / boundsH
    ),
    MIN_SCALE,
    MAX_SCALE
  );

  const centerX = minX + boundsW / 2;
  const centerY = minY + boundsH / 2;

  return {
    x: width / 2 - centerX * scale,
    y: CANVAS_HEIGHT / 2 - centerY * scale,
    scale,
  };
}

const HouseCanvas = forwardRef<HouseCanvasHandle, Props>(function HouseCanvas(
  { rooms, setRooms, onEnterRoom, onVisibilityChange },
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
  // - suppressClickRef/gestureStartScreenRef stop a Space-pan (or any drag
  //   past a few pixels) from also firing a click on release - see
  //   handleStageMouseDown/Move below.
  // - lastValidSize remembers each room's last non-overlapping size so the
  //   resize handle's dragBoundFunc can reject a resize without ever
  //   calling setState. Position dragging no longer blocks mid-drag (see
  //   the room Group's onDragMove/onDragEnd), so it has no equivalent ref.
  const spacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const gestureStartScreenRef = useRef<{ x: number; y: number } | null>(null);
  const lastValidSizeRef = useRef(new Map<number, { w: number; h: number }>());
  const rectRefs = useRef(new Map<number, Konva.Rect>());

  // keep the "last known good" ref in sync whenever fresh data arrives
  // (after a fetch, a resize/move from elsewhere, etc).
  useEffect(() => {
    rooms.forEach(r => {
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

      fitToScreen: () => setViewport(computeFitViewport(rooms, containerWidth)),
    }),
    [viewport, containerWidth, rooms]
  );

  // Auto-fit once per mount (i.e. on first open AND every time this
  // component remounts from re-entering the house view), so the whole
  // layout is visible without the user having to click "Fit to screen"
  // themselves. The parent renders this component before `rooms` has
  // finished loading (it starts as []), so this must re-run once rooms
  // actually arrive rather than only on the initial (empty) mount - hence
  // depending on `rooms` itself, guarded by the ref to fire only once.
  // Reads clientWidth directly rather than the containerWidth state, which
  // may not have been measured yet on this same render pass.
  const hasAutoFitRef = useRef(false);
  useEffect(() => {
    if (hasAutoFitRef.current || rooms.length === 0) return;
    hasAutoFitRef.current = true;
    const width = containerRef.current?.clientWidth ?? containerWidth;
    setViewport(computeFitViewport(rooms, width));
  }, [rooms, containerWidth]);

  // Tell the parent whenever any room (or its label) is partly/fully
  // outside the current viewport, so it can highlight "Fit to screen".
  useEffect(() => {
    if (!onVisibilityChange) return;

    const visTopLeft = toWorld({ x: 0, y: 0 }, viewport);
    const visBottomRight = toWorld({ x: containerWidth, y: CANVAS_HEIGHT }, viewport);

    const allVisible = rooms.every(r => {
      const top = r.pos_y - LABEL_HEIGHT;
      const bottom = r.pos_y + r.height / 2;
      const left = r.pos_x;
      const right = r.pos_x + r.width / 2;

      return (
        left >= visTopLeft.x &&
        right <= visBottomRight.x &&
        top >= visTopLeft.y &&
        bottom <= visBottomRight.y
      );
    });

    onVisibilityChange(allVisible);
  }, [viewport, containerWidth, rooms, onVisibilityChange]);

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
  const CLICK_MOVE_THRESHOLD = 4;

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const clickedEmptyCanvas = e.target === stage;
    if (!clickedEmptyCanvas && !spacePressedRef.current) {
      suppressClickRef.current = false;
      return;
    }

    isPanningRef.current = true;
    lastPointerRef.current = stage.getPointerPosition();
    gestureStartScreenRef.current = lastPointerRef.current;
    // A Space-pan starting here must never register as a click on release,
    // even with ~0 net movement (e.g. a quick tap-and-release over a room).
    suppressClickRef.current = spacePressedRef.current;
    stage.container().style.cursor = 'grabbing';
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanningRef.current) return;

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    const last = lastPointerRef.current;
    if (!stage || !pointer || !last) return;

    const start = gestureStartScreenRef.current;
    if (
      start &&
      (Math.abs(pointer.x - start.x) > CLICK_MOVE_THRESHOLD ||
        Math.abs(pointer.y - start.y) > CLICK_MOVE_THRESHOLD)
    ) {
      suppressClickRef.current = true;
    }

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
                onDragStart={(e) => {
                  // Konva drag events bubble: dragging the resize handle (a
                  // child of this Group) also fires this handler with
                  // e.target pointing at the handle, not the Group. Only
                  // react when this Group is the node actually being dragged.
                  if (e.target !== e.currentTarget) return;
                  // Bring the dragged room to the front so its overlap tint
                  // (see onDragMove) is actually visible when it's dragged
                  // underneath another room, instead of being hidden by it.
                  e.target.moveToTop();
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'grabbing';
                }}
                onDragMove={(e) => {
                  // Same bubbling guard as onDragStart above.
                  if (e.target !== e.currentTarget) return;

                  // No dragBoundFunc any more: the room follows the cursor
                  // freely, even through an overlap (fixing the old "jumps
                  // to the far side of the obstacle" feel). Instead, give a
                  // live visual warning here - the actual accept/revert
                  // decision happens once, at onDragEnd.
                  const overlapping = overlapsAny(
                    { x: e.target.x(), y: e.target.y(), w: pixelW, h: pixelH },
                    roomsExcept(rooms, room.id),
                    LABEL_HEIGHT
                  );

                  const rect = rectRefs.current.get(room.id);
                  if (rect) {
                    rect.opacity(overlapping ? 0.5 : 1);
                    rect.stroke(overlapping ? '#ef4444' : '#cbd5e1');
                    rect.getLayer()?.batchDraw();
                  }
                }}
                onDragEnd={async (e) => {
                  // Same bubbling guard as onDragStart above - without this,
                  // releasing the resize handle also runs this handler with
                  // e.target still set to the handle.
                  if (e.target !== e.currentTarget) return;

                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'pointer';

                  const rect = rectRefs.current.get(room.id);
                  const resetVisual = () => {
                    if (rect) {
                      rect.opacity(1);
                      rect.stroke('#cbd5e1');
                      rect.getLayer()?.batchDraw();
                    }
                  };

                  // e.target.x()/y() are already world coordinates (no
                  // dragBoundFunc on this Group any more to translate).
                  const desired = { x: e.target.x(), y: e.target.y(), w: pixelW, h: pixelH };
                  const lastValid = { x: room.pos_x, y: room.pos_y, w: pixelW, h: pixelH };
                  const { position, overlapping } = resolveFreeDragEnd(
                    desired,
                    lastValid,
                    roomsExcept(rooms, room.id),
                    LABEL_HEIGHT
                  );

                  if (overlapping) {
                    // Still overlapping at release - ease back to the last
                    // valid spot rather than persisting (nothing to save;
                    // the position reverts to what's already in state).
                    animatePositionTo(
                      { x: e.target.x(), y: e.target.y() },
                      position,
                      150,
                      point => {
                        e.target.position(point);
                        e.target.getLayer()?.batchDraw();
                      },
                      resetVisual
                    );
                    return;
                  }

                  resetVisual();

                  setRooms(prev =>
                    prev.map(r =>
                      r.id === room.id ? { ...r, pos_x: position.x, pos_y: position.y } : r
                    )
                  );

                  try {
                    await API.rooms.updatePosition(room.id, {
                      pos_x: position.x,
                      pos_y: position.y,
                    });
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
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    onEnterRoom(room.id);
                  }}
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

                {/* ZONE PREVIEW (static, non-interactive) - a "zoomed out"
                    minimap of the room's zone layout, scaled to always fit
                    entirely inside the room's own card. Inside the room
                    view, zones move/resize freely in their own independent
                    space with no tie to this card's size, so rather than
                    clipping away whatever doesn't fit, this scales the
                    whole layout down (never up) so it's always ALL visible
                    here, just smaller when the room has a lot going on. */}
                {(() => {
                  const preview = computeZonePreview(room.zones, pixelW, pixelH);
                  return (
                    <Group
                      x={preview.offsetX}
                      y={preview.offsetY}
                      scaleX={preview.scale}
                      scaleY={preview.scale}
                      offsetX={preview.boundsMinX}
                      offsetY={preview.boundsMinY}
                    >
                      {room.zones.map(zone => {
                        // A zone's on-screen size here is its own size
                        // TIMES this minimap's scale (the ancestor Group's
                        // scaleX/scaleY above) - too small on screen and
                        // even a correctly-truncated label is unreadable,
                        // so hide it entirely rather than show illegible
                        // text (the full name is still always available in
                        // the room view itself).
                        const scaledWidth = zone.width * preview.scale;
                        const scaledHeight = zone.height * preview.scale;
                        const labelFits = scaledWidth >= MIN_ZONE_LABEL_SCALED_WIDTH && scaledHeight >= MIN_ZONE_LABEL_SCALED_HEIGHT;

                        return (
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
                            {labelFits && (
                              // Clipped to the zone's own bounds as a safety
                              // net, same as the room view's label truncation,
                              // so a name can never touch or cross the edge.
                              <Group listening={false} clipFunc={(ctx) => ctx.rect(0, 0, zone.width, zone.height)}>
                                <Text
                                  x={5}
                                  y={5}
                                  width={zoneLabelWidth(zone.width)}
                                  {...zoneLabelWrapProps}
                                  text={zone.name}
                                  fontSize={10}
                                  fill="#1e3a8a"
                                  listening={false}
                                />
                              </Group>
                            )}
                          </Group>
                        );
                      })}
                    </Group>
                  );
                })()}

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

                    const { minW, minH } = ROOM_MIN_PIXEL_SIZE;
                    // Round every frame, not just at drag end, so the size
                    // the collision check sees is always the same whole-number
                    // size that eventually gets persisted - never a fractional
                    // in-between value that happens to miss a neighbour.
                    const desiredW = Math.round(Math.max(minW, roomLocal.x + HANDLE_SIZE));
                    const desiredH = Math.round(Math.max(minH, roomLocal.y + HANDLE_SIZE));

                    const last = lastValidSizeRef.current.get(room.id) ?? {
                      w: pixelW,
                      h: pixelH,
                    };

                    // Same collision rule as room dragging - just applied to
                    // size instead of position.
                    const resolved = resolveNonOverlapping(
                      { x: room.pos_x, y: room.pos_y, w: desiredW, h: desiredH },
                      { x: room.pos_x, y: room.pos_y, w: last.w, h: last.h },
                      rooms,
                      room.id
                    );

                    lastValidSizeRef.current.set(room.id, { w: resolved.w, h: resolved.h });

                    // Live-resize the room body imperatively - no setState,
                    // just a direct Konva mutation plus a redraw.
                    const rect = rectRefs.current.get(room.id);
                    if (rect) {
                      rect.width(resolved.w);
                      rect.height(resolved.h);
                      rect.getLayer()?.batchDraw();
                    }

                    const newWorld = {
                      x: room.pos_x + resolved.w - HANDLE_SIZE,
                      y: room.pos_y + resolved.h - HANDLE_SIZE,
                    };
                    return toScreen(newWorld, viewport);
                  }}
                  onDragEnd={async (e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';

                    // Re-run the same collision check against the rect's
                    // actual final size, in case the last pointer position
                    // never went through dragBoundFunc (mirrors the room-drag
                    // onDragEnd guard above) - this is what guarantees a
                    // resize can never persist an overlapping size.
                    const rect = rectRefs.current.get(room.id);
                    const lastGood = lastValidSizeRef.current.get(room.id) ?? {
                      w: pixelW,
                      h: pixelH,
                    };
                    const actual = {
                      w: Math.round(rect ? rect.width() : lastGood.w),
                      h: Math.round(rect ? rect.height() : lastGood.h),
                    };

                    const resolved = resolveNonOverlapping(
                      { x: room.pos_x, y: room.pos_y, w: actual.w, h: actual.h },
                      { x: room.pos_x, y: room.pos_y, w: lastGood.w, h: lastGood.h },
                      rooms,
                      room.id
                    );

                    if (rect && (resolved.w !== actual.w || resolved.h !== actual.h)) {
                      rect.width(resolved.w);
                      rect.height(resolved.h);
                      rect.getLayer()?.batchDraw();
                    }

                    setRooms(prev =>
                      prev.map(r =>
                        r.id === room.id
                          ? { ...r, width: resolved.w * 2, height: resolved.h * 2 }
                          : r
                      )
                    );

                    try {
                      await API.rooms.updateSize(room.id, {
                        width: resolved.w * 2,
                        height: resolved.h * 2,
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
