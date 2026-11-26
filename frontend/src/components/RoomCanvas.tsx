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
import { overlapsAny, resolveNonOverlapping, resolveFreeDragEnd, type AABB } from '../lib/collision';
import { animatePositionTo } from '../lib/animate';
import { computeFurnitureShapes } from '../lib/furnitureShapes';
import { zoneLabelWidth, zoneLabelWrapProps } from '../lib/zoneLabel';

// --- world <-> screen conversion -------------------------------------------
// Same camera concept as HouseCanvas: zone x/y are plain "world space"
// numbers, independent of the Stage's own pan/zoom. A zone here is to this
// canvas what a room is to HouseCanvas - the room itself is just the
// camera's open space, not a drawn, bounded rect any more.
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
  room: Room;
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  setSelectedZone: (zone: any) => void;
  highlightedZoneId: number | null;
  /** Called whenever every zone is (or stops being) fully inside the current viewport. */
  onVisibilityChange?: (allVisible: boolean) => void;
}

export interface RoomCanvasHandle {
  /** Pan/zoom so every zone is framed in view, like Figma's "zoom to fit". */
  fitToScreen: () => void;
}

const HANDLE_SIZE = 10;
const MIN_ZONE_SIZE = 30;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
const ZOOM_STEP = 1.05;
const FIT_PADDING = 80;
const CANVAS_HEIGHT = 560;

// A zone's name label sits INSIDE its own rect (unlike a room's, which
// floats above it), so no extra margin is folded into zone-vs-zone checks.
function zonesExcept(zones: Zone[], currentZoneId: number): AABB[] {
  return zones
    .filter(z => z.id !== currentZoneId)
    .map(z => ({ x: z.pos_x, y: z.pos_y, w: z.width, h: z.height }));
}

// Shared by the imperative fitToScreen() handle and the auto-fit-on-mount
// effect, so both frame every zone the same way.
function computeFitViewport(zones: Zone[], width: number): Viewport {
  if (zones.length === 0) return { x: 0, y: 0, scale: 1 };

  const minX = Math.min(...zones.map(z => z.pos_x));
  const minY = Math.min(...zones.map(z => z.pos_y));
  const maxX = Math.max(...zones.map(z => z.pos_x + z.width));
  const maxY = Math.max(...zones.map(z => z.pos_y + z.height));

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

const RoomCanvas = forwardRef<RoomCanvasHandle, Props>(function RoomCanvas(
  { room, setRooms, setSelectedZone, highlightedZoneId, onVisibilityChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [hoveredZoneId, setHoveredZoneId] = useState<number | null>(null);

  // Mutable, per-gesture tracking that must NOT trigger re-renders - same
  // pattern as HouseCanvas (see its comments for the full rationale).
  // suppressClickRef/gestureStartScreenRef stop a Space-pan (or any drag
  // past a few pixels) from also firing a click on release. lastValidSize
  // is for the resize handle only - position dragging no longer blocks
  // mid-drag (see onDragMove/onDragEnd below), so it has no equivalent ref.
  const spacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const gestureStartScreenRef = useRef<{ x: number; y: number } | null>(null);
  const lastValidSizeRef = useRef(new Map<number, { w: number; h: number }>());
  const zoneRectRefs = useRef(new Map<number, Konva.Rect>());
  const labelRefs = useRef(new Map<number, Konva.Text>());
  // Per-zone map of furniture shape key -> its live Konva node, so a resize
  // can update the shelf/drawer lines etc. imperatively every frame instead
  // of waiting for React to re-render FurnitureIcon on drag end.
  const furnitureShapeRefs = useRef(new Map<number, Map<string, Konva.Shape>>());

  function getFurnitureShapeMap(zoneId: number): Map<string, Konva.Shape> {
    let m = furnitureShapeRefs.current.get(zoneId);
    if (!m) {
      m = new Map();
      furnitureShapeRefs.current.set(zoneId, m);
    }
    return m;
  }

  useEffect(() => {
    room.zones.forEach(z => {
      lastValidSizeRef.current.set(z.id, { w: z.width, h: z.height });
    });
  }, [room]);

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
      fitToScreen: () => setViewport(computeFitViewport(room.zones, containerWidth)),
    }),
    [room, containerWidth]
  );

  // Auto-fit once per mount (i.e. every time you enter a room), so the
  // whole zone layout is visible without having to click "Fit to screen"
  // yourself - mirrors HouseCanvas's auto-fit-on-enter.
  const hasAutoFitRef = useRef(false);
  useEffect(() => {
    if (hasAutoFitRef.current || room.zones.length === 0) return;
    hasAutoFitRef.current = true;
    const width = containerRef.current?.clientWidth ?? containerWidth;
    setViewport(computeFitViewport(room.zones, width));
  }, [room, containerWidth]);

  // Tell the parent whenever any zone is partly/fully outside the current
  // viewport, so it can highlight "Fit to screen" - mirrors HouseCanvas.
  useEffect(() => {
    if (!onVisibilityChange) return;

    const visTopLeft = toWorld({ x: 0, y: 0 }, viewport);
    const visBottomRight = toWorld({ x: containerWidth, y: CANVAS_HEIGHT }, viewport);

    const allVisible = room.zones.every(z => {
      const left = z.pos_x;
      const top = z.pos_y;
      const right = z.pos_x + z.width;
      const bottom = z.pos_y + z.height;

      return (
        left >= visTopLeft.x &&
        right <= visBottomRight.x &&
        top >= visTopLeft.y &&
        bottom <= visBottomRight.y
      );
    });

    onVisibilityChange(allVisible);
  }, [viewport, containerWidth, room, onVisibilityChange]);

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
  // Space pans even when the cursor is over a zone.
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
    // even with ~0 net movement (e.g. a quick tap-and-release over a zone).
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
          {room.zones.map(zone => (
            <Group
              key={zone.id}
              x={zone.pos_x}
              y={zone.pos_y}
              draggable={!spacePressed}

              onClick={() => {
                if (suppressClickRef.current) return;
                setSelectedZone({
                  id: zone.id,
                  name: zone.name,
                  type: zone.type,
                  width: zone.width,
                  height: zone.height,
                  attributes: zone.attributes || {},
                  roomId: room.id,
                });
              }}

              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'pointer';
                setHoveredZoneId(zone.id);
              }}

              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';
                setHoveredZoneId(prev => (prev === zone.id ? null : prev));
              }}

              onDragStart={(e) => {
                // Konva drag events bubble: dragging the resize handle (a
                // child of this Group) also fires this handler with
                // e.target pointing at the handle, not this Group. Only
                // react when this Group itself is being dragged.
                if (e.target !== e.currentTarget) return;
                // Bring the dragged zone to the front so its overlap tint
                // (see onDragMove) is actually visible when it's dragged
                // underneath another zone, instead of being hidden by it.
                e.target.moveToTop();
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'grabbing';
              }}

              onDragMove={(e) => {
                // Same bubbling guard as onDragStart above.
                if (e.target !== e.currentTarget) return;

                // No dragBoundFunc any more: the zone follows the cursor
                // freely, even through an overlap (fixing the old "jumps to
                // the far side of the obstacle" feel). Instead, give a live
                // visual warning here - the actual accept/revert decision
                // happens once, at onDragEnd.
                const overlapping = overlapsAny(
                  { x: e.target.x(), y: e.target.y(), w: zone.width, h: zone.height },
                  zonesExcept(room.zones, zone.id)
                );

                const rect = zoneRectRefs.current.get(zone.id);
                if (rect) {
                  rect.opacity(overlapping ? 0.5 : 1);
                  rect.stroke(overlapping ? '#ef4444' : (highlightedZoneId === zone.id ? '#eab308' : '#60a5fa'));
                  rect.getLayer()?.batchDraw();
                }

                // The zone's label lives on a separate top layer (so it's
                // never hidden under a neighbouring zone) and so isn't a
                // child of this Group - move it along by hand.
                const label = labelRefs.current.get(zone.id);
                if (label) {
                  label.position({ x: e.target.x() + 6, y: e.target.y() + 6 });
                  label.getLayer()?.batchDraw();
                }
              }}

              onDragEnd={async (e) => {
                // Same bubbling guard as onDragStart above.
                if (e.target !== e.currentTarget) return;

                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'pointer';

                const rect = zoneRectRefs.current.get(zone.id);
                const resetVisual = () => {
                  if (rect) {
                    rect.opacity(1);
                    rect.stroke(highlightedZoneId === zone.id ? '#eab308' : '#60a5fa');
                    rect.getLayer()?.batchDraw();
                  }
                };

                // e.target.x()/y() are already world coordinates (no
                // dragBoundFunc on this Group any more to translate).
                const desired = { x: e.target.x(), y: e.target.y(), w: zone.width, h: zone.height };
                const lastValid = { x: zone.pos_x, y: zone.pos_y, w: zone.width, h: zone.height };
                const { position, overlapping } = resolveFreeDragEnd(
                  desired,
                  lastValid,
                  zonesExcept(room.zones, zone.id)
                );

                if (overlapping) {
                  // Still overlapping at release - ease back to the last
                  // valid spot rather than persisting.
                  animatePositionTo(
                    { x: e.target.x(), y: e.target.y() },
                    position,
                    150,
                    point => {
                      e.target.position(point);
                      const label = labelRefs.current.get(zone.id);
                      if (label) label.position({ x: point.x + 6, y: point.y + 6 });
                      e.target.getLayer()?.batchDraw();
                    },
                    resetVisual
                  );
                  return;
                }

                resetVisual();

                const resolved = position;

                setRooms(prev =>
                  prev.map(r =>
                    r.id === room.id
                      ? {
                          ...r,
                          zones: r.zones.map(z =>
                            z.id === zone.id ? { ...z, pos_x: resolved.x, pos_y: resolved.y } : z
                          ),
                        }
                      : r
                  )
                );

                try {
                  await API.zones.updatePosition(zone.id, {
                    pos_x: resolved.x,
                    pos_y: resolved.y,
                  });
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              <Rect
                ref={node => {
                  if (node) zoneRectRefs.current.set(zone.id, node);
                }}
                width={zone.width}
                height={zone.height}
                cornerRadius={4}
                fill={highlightedZoneId === zone.id ? '#fde047' : '#bfdbfe'}
                stroke={highlightedZoneId === zone.id ? '#eab308' : '#60a5fa'}
                strokeWidth={highlightedZoneId === zone.id ? 2 : 1.5}
              />

              {/* Clipped to the zone's own (live) size, read from the rect
                  ref rather than the zone prop, so the clip region itself
                  stays correct during a live resize too, not just the
                  shapes inside it. */}
              <Group
                listening={false}
                clipFunc={(ctx) => {
                  const rect = zoneRectRefs.current.get(zone.id);
                  const w = rect ? rect.width() : zone.width;
                  const h = rect ? rect.height() : zone.height;
                  ctx.rect(0, 0, w, h);
                }}
              >
                <FurnitureIcon
                  type={zone.type}
                  width={zone.width}
                  height={zone.height}
                  attributes={zone.attributes}
                  shapeRefs={getFurnitureShapeMap(zone.id)}
                />
              </Group>

              {/* RESIZE HANDLE */}
              <Rect
                x={zone.width - HANDLE_SIZE}
                y={zone.height - HANDLE_SIZE}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                cornerRadius={2}
                fill="#1e3a8a"
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
                  // the zone's own origin to get a size (zone-local) delta.
                  const world = toWorld(pos, viewport);
                  const zoneLocal = { x: world.x - zone.pos_x, y: world.y - zone.pos_y };

                  // Round every frame, not just at drag end, so the size the
                  // collision check sees is always the same whole-number
                  // size that eventually gets persisted.
                  const desiredW = Math.round(Math.max(MIN_ZONE_SIZE, zoneLocal.x + HANDLE_SIZE));
                  const desiredH = Math.round(Math.max(MIN_ZONE_SIZE, zoneLocal.y + HANDLE_SIZE));

                  const last = lastValidSizeRef.current.get(zone.id) ?? {
                    w: zone.width,
                    h: zone.height,
                  };

                  // Same collision rule as zone dragging - just applied to
                  // size instead of position.
                  const resolved = resolveNonOverlapping(
                    { x: zone.pos_x, y: zone.pos_y, w: desiredW, h: desiredH },
                    { x: zone.pos_x, y: zone.pos_y, w: last.w, h: last.h },
                    zonesExcept(room.zones, zone.id)
                  );

                  lastValidSizeRef.current.set(zone.id, { w: resolved.w, h: resolved.h });

                  // Live-resize the zone body imperatively - no setState,
                  // just a direct Konva mutation plus a redraw.
                  const rect = zoneRectRefs.current.get(zone.id);
                  if (rect) {
                    rect.width(resolved.w);
                    rect.height(resolved.h);
                  }

                  // Same for the furniture decoration inside it: recompute
                  // the shape geometry for the live size and push it onto
                  // the existing nodes directly - no React re-render per
                  // frame, and the clipFunc above reads the rect's own live
                  // width/height, so nothing can stick out past the edge
                  // while this is mid-flight.
                  const furnitureMap = furnitureShapeRefs.current.get(zone.id);
                  if (furnitureMap) {
                    const shapes = computeFurnitureShapes(zone.type, resolved.w, resolved.h, zone.attributes);
                    const byKey = new Map(shapes.map(s => [s.key, s]));

                    furnitureMap.forEach((node, key) => {
                      const shape = byKey.get(key);
                      if (!shape) {
                        node.visible(false);
                        return;
                      }
                      node.visible(true);
                      if (shape.kind === 'line') {
                        (node as Konva.Line).points(shape.points);
                      } else if (shape.kind === 'circle') {
                        node.position({ x: shape.x, y: shape.y });
                        (node as Konva.Circle).radius(shape.radius);
                      } else {
                        node.position({ x: shape.x, y: shape.y });
                        (node as Konva.Rect).width(shape.width);
                        (node as Konva.Rect).height(shape.height);
                      }
                    });
                  }

                  // Keep the name's ellipsis-truncation width in sync too.
                  const label = labelRefs.current.get(zone.id);
                  if (label) {
                    label.width(zoneLabelWidth(resolved.w));
                  }

                  rect?.getLayer()?.batchDraw();

                  const newWorld = {
                    x: zone.pos_x + resolved.w - HANDLE_SIZE,
                    y: zone.pos_y + resolved.h - HANDLE_SIZE,
                  };
                  return toScreen(newWorld, viewport);
                }}
                onDragEnd={async (e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'default';

                  // Re-run the same collision check against the rect's
                  // actual final size, in case the last pointer position
                  // never went through dragBoundFunc.
                  const rect = zoneRectRefs.current.get(zone.id);
                  const lastGood = lastValidSizeRef.current.get(zone.id) ?? {
                    w: zone.width,
                    h: zone.height,
                  };
                  const actual = {
                    w: Math.round(rect ? rect.width() : lastGood.w),
                    h: Math.round(rect ? rect.height() : lastGood.h),
                  };

                  const resolved = resolveNonOverlapping(
                    { x: zone.pos_x, y: zone.pos_y, w: actual.w, h: actual.h },
                    { x: zone.pos_x, y: zone.pos_y, w: lastGood.w, h: lastGood.h },
                    zonesExcept(room.zones, zone.id)
                  );

                  if (rect && (resolved.w !== actual.w || resolved.h !== actual.h)) {
                    rect.width(resolved.w);
                    rect.height(resolved.h);
                    rect.getLayer()?.batchDraw();
                  }

                  setRooms(prev =>
                    prev.map(r =>
                      r.id === room.id
                        ? {
                            ...r,
                            zones: r.zones.map(z =>
                              z.id === zone.id ? { ...z, width: resolved.w, height: resolved.h } : z
                            ),
                          }
                        : r
                    )
                  );

                  try {
                    await API.zones.updateSize(zone.id, {
                      width: resolved.w,
                      height: resolved.h,
                    });
                  } catch (err) {
                    console.error(err);
                  }
                }}
              />
            </Group>
          ))}
        </Layer>

        {/* LABELS - a dedicated top layer so a zone's name always draws
            above every zone body, never hidden under a neighbouring zone.
            Truncated with an ellipsis to the zone's own width (Konva's
            built-in wrap="none" + ellipsis, kept in sync with live width
            during a resize - see the resize handle above) so a long name
            can't overflow onto a neighbouring zone either. The full name
            is always available on hover (tooltip, below) and in the
            detail panel when the zone is selected. */}
        <Layer listening={false}>
          {room.zones.map(zone => (
            <Text
              key={zone.id}
              ref={node => {
                if (node) labelRefs.current.set(zone.id, node);
              }}
              x={zone.pos_x + 6}
              y={zone.pos_y + 6}
              width={zoneLabelWidth(zone.width)}
              {...zoneLabelWrapProps}
              text={zone.name}
              fontSize={12}
              fill="#1e3a8a"
            />
          ))}

          {/* Hover tooltip with the zone's full (untruncated) name. */}
          {hoveredZoneId !== null && (() => {
            const zone = room.zones.find(z => z.id === hoveredZoneId);
            if (!zone) return null;

            const padding = 6;
            const tooltipWidth = Math.max(40, zone.name.length * 6.5 + padding * 2);
            const tooltipHeight = 20;

            return (
              <Group key="zone-tooltip">
                <Rect
                  x={zone.pos_x}
                  y={zone.pos_y - tooltipHeight - 4}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  cornerRadius={4}
                  fill="#1e293b"
                  opacity={0.92}
                />
                <Text
                  x={zone.pos_x + padding}
                  y={zone.pos_y - tooltipHeight - 4 + 4}
                  text={zone.name}
                  fontSize={12}
                  fill="#ffffff"
                />
              </Group>
            );
          })()}
        </Layer>
      </Stage>
    </div>
  );
});

export default RoomCanvas;
