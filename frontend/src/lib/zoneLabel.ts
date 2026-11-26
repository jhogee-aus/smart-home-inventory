// Shared truncation rule for a zone's name label, used identically by the
// room view's live labels and the house view's zone-preview minimap, so a
// long name always ends in "…" instead of overflowing its own zone - never
// two separately-tuned copies of the same padding/wrap/ellipsis settings.
//
// The width this computes is in the zone's OWN local units (same units as
// zone.width itself). When the label sits inside an ancestor Konva Group
// that's been scaled down (e.g. the house view's "zoom out" minimap), that
// scale applies to this width automatically along with everything else in
// the group - so passing the zone's full, unscaled width here already
// yields the correct effective (scaled) wrapping boundary on screen. Each
// caller picks its own fontSize; only the width/wrap/ellipsis are shared.
export const ZONE_LABEL_PADDING = 6;

export function zoneLabelWidth(zoneWidth: number): number {
  return Math.max(0, zoneWidth - ZONE_LABEL_PADDING * 2);
}

export const zoneLabelWrapProps = {
  wrap: 'none' as const,
  ellipsis: true,
};
