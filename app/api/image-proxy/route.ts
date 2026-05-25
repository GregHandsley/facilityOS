import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing image URL", { status: 400 });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return new NextResponse("Invalid image URL", { status: 400 });
  }

  if (parsedUrl.protocol !== "https:") {
    return new NextResponse("Only HTTPS images are supported", { status: 400 });
  }

  try {
    const imageResponse = await fetch(parsedUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        Referer: `${parsedUrl.protocol}//${parsedUrl.hostname}/`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!imageResponse.ok || !imageResponse.body) {
      return unavailableImage();
    }

    const contentType = imageResponse.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/")) {
      return unavailableImage();
    }

    return new NextResponse(imageResponse.body, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Type": contentType,
      },
    });
  } catch {
    return unavailableImage();
  }
}

function unavailableImage() {
  return new NextResponse(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
      <rect width="960" height="640" rx="32" fill="#17191d"/>
      <rect x="36" y="36" width="888" height="568" rx="28" fill="#202328" stroke="#30343a"/>
      <g fill="none" stroke="#36d98c" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
        <path d="M360 380h240"/>
        <path d="M420 300h120"/>
        <path d="M390 300l-70 120"/>
        <path d="M570 300l70 120"/>
        <circle cx="480" cy="230" r="42"/>
      </g>
      <text x="480" y="500" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="34">Image unavailable</text>
    </svg>`,
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": "image/svg+xml",
      },
    },
  );
}
