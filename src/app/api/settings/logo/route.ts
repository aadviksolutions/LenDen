import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, AuthError } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

export async function POST(request: NextRequest) {
  try {
    const { business } = await requireTenantAccess(undefined, ['BUSINESS_OWNER']);

    const contentType = request.headers.get('content-type') || '';
    let logoDataUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No image file provided in request.' }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: 'Unsupported format. Please upload PNG, JPEG, WebP, or SVG.' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'Image size exceeds 2.5 MB limit. Please compress your logo.' },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      logoDataUrl = `data:${file.type};base64,${base64}`;

      // Also persist to public/uploads/logos/ for static fast delivery if supported
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1] || 'png';
        const fileName = `${business.id}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
      } catch (fsErr) {
        console.warn('Local static disk save skipped, falling back to database base64:', fsErr);
      }
    } else {
      const body = await request.json();
      if (!body.logoUrl && !body.dataUrl) {
        return NextResponse.json({ success: false, error: 'No logo payload provided.' }, { status: 400 });
      }
      logoDataUrl = body.logoUrl || body.dataUrl;
    }

    // Persist to database
    const updated = await prisma.business.update({
      where: { id: business.id },
      data: { logoUrl: logoDataUrl },
      select: { id: true, name: true, logoUrl: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Brand logo uploaded and applied successfully!',
      logoUrl: updated.logoUrl,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to upload logo';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { business } = await requireTenantAccess(undefined, ['BUSINESS_OWNER']);

    await prisma.business.update({
      where: { id: business.id },
      data: { logoUrl: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Custom logo removed. Reverted to default monogram.',
      logoUrl: null,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to remove logo';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
