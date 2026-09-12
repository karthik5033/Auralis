export function maskName(name: string, role?: string): string {
  if (!name) return "";
  // Administrative and supervisory roles can see unmasked names
  if (role === "ADMIN" || role === "SUPERINTENDENT" || role === "INSPECTOR") {
    return name;
  }
  
  // Mask names for constables or unauthenticated roles (e.g., "John Doe" -> "J*** D***")
  const parts = name.split(" ");
  return parts
    .map((part) => (part.length > 1 ? part[0] + "*".repeat(Math.max(part.length - 1, 3)) : part))
    .join(" ");
}
