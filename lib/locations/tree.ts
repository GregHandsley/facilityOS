import type { FacilityLocation, LocationNode } from "@/types/facility";

export function buildLocationTree(locations: FacilityLocation[]): LocationNode[] {
  const activeLocations = locations.filter((location) => !location.archived);
  const nodesById = new Map<string, LocationNode>();

  activeLocations.forEach((location) => {
    nodesById.set(location.id, { ...location, children: [] });
  });

  const roots: LocationNode[] = [];

  nodesById.forEach((node) => {
    if (node.parentLocationId && nodesById.has(node.parentLocationId)) {
      nodesById.get(node.parentLocationId)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  const sortNodes = (nodes: LocationNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);

  return roots;
}

export function getLocationParentOptions(locations: FacilityLocation[]) {
  return locations
    .filter((location) => !location.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}
