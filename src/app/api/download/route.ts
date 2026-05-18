import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

// Ensure the cache is persistent across hot-reloads in Next.js development mode
const globalForCache = global as unknown as {
  downloadCache?: Map<string, { content: string; filename: string; contentType: string; isBase64: boolean }>;
};

if (!globalForCache.downloadCache) {
  globalForCache.downloadCache = new Map();
}
const downloadCache = globalForCache.downloadCache;

// POST: Store the file content temporarily and return an ID
export async function POST(req: Request) {
  try {
    let content = '';
    let filename = 'download.txt';
    let contentType = 'text/plain';
    let isBase64 = false;

    const contentTypeHeader = req.headers.get('content-type') || '';
    console.log('[download] POST request received. Content-Type:', contentTypeHeader);

    if (contentTypeHeader.includes('application/json')) {
      const json = await req.json();
      content = json.content || '';
      filename = json.filename || 'download.txt';
      contentType = json.contentType || 'text/plain';
      isBase64 = !!json.isBase64;
    } else if (contentTypeHeader.includes('application/x-www-form-urlencoded')) {
      const bodyText = await req.text();
      const params = new URLSearchParams(bodyText);
      content = params.get('content') || '';
      filename = params.get('filename') || 'download.txt';
      contentType = params.get('contentType') || 'text/plain';
      isBase64 = params.get('isBase64') === 'true';
    } else {
      // Fallback to standard multipart form-data
      const formData = await req.formData();
      content = formData.get('content') as string || '';
      filename = formData.get('filename') as string || 'download.txt';
      contentType = formData.get('contentType') as string || 'text/plain';
      isBase64 = formData.get('isBase64') as string === 'true';
    }

    console.log('[download] Parsed metadata - filename:', filename, 'contentType:', contentType, 'isBase64:', isBase64, 'contentLength:', content ? content.length : 0);

    if (!content) {
      console.warn('[download] Warning: No content was found in request.');
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Generate a unique ID
    const id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    // Cache the download details
    downloadCache.set(id, {
      content,
      filename,
      contentType,
      isBase64
    });

    // Automatically clean up cache after 1 minute to prevent memory leak
    setTimeout(() => {
      downloadCache.delete(id);
    }, 60000);

    console.log('[download] Successfully cached file. Generated download ID:', id);
    return NextResponse.json({ id });
  } catch (err: any) {
    console.error('[download] Download POST cache error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Retrieve and download the stored file by ID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    console.log('[download] GET request received for ID:', id);

    if (!id) {
      return new Response('Missing download ID', { status: 400 });
    }

    const cached = downloadCache.get(id);
    if (!cached) {
      console.warn('[download] Warning: Requested download ID not found in cache or expired:', id);
      return new Response('Download link expired or invalid. Please try exporting again.', { status: 404 });
    }

    // Clean up cache immediately upon fetch
    downloadCache.delete(id);

    const { content, filename, contentType, isBase64 } = cached;
    console.log('[download] Serving file:', filename, 'MIME:', contentType, 'Length:', content.length);

    // Determine body format (binary buffer for base64/pdf, string for text/doc)
    let body: Uint8Array | string = content;
    if (isBase64) {
      body = Buffer.from(content, 'base64');
    }

    return new NextResponse(body as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[download] Download GET error:', err);
    return new Response(`Download error: ${err.message}`, { status: 500 });
  }
}
