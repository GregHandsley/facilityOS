export function slugifyEquipmentName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function createEquipmentSlug({
  equipmentNumber,
  id,
  name,
}: {
  equipmentNumber?: string;
  id: string;
  name: string;
}) {
  const base = slugifyEquipmentName(
    [name, equipmentNumber].filter(Boolean).join(" "),
  );
  const suffix = id.slice(0, 8).toLowerCase();

  return `${base || "equipment"}-${suffix}`;
}
