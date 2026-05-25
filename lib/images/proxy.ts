export function getProxiedImageUrl(imageUrl: string) {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("/") || imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  try {
    const parsedUrl = new URL(imageUrl);

    if (parsedUrl.protocol !== "https:") {
      return "";
    }

    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  } catch {
    return "";
  }
}
