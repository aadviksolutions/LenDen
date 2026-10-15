import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import {
  parseAndValidateCsv,
  commitCsvImport,
  getProducts,
} from '@/lib/services/inventoryService';

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireTenantAccess();
    const body = await req.json();
    const { csvText, action } = body;

    if (!csvText || typeof csvText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No CSV content provided.' },
        { status: 400 }
      );
    }

    // Fetch existing SKUs for this business to check for catalog collisions
    const existingProducts = await getProducts(business.id, { includeArchived: true });
    const existingSkus = new Set(existingProducts.map((p) => p.sku.toLowerCase()));

    const { validRows, errors } = parseAndValidateCsv(csvText, existingSkus);

    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        validCount: validRows.length,
        errorCount: errors.length,
        errors,
        previewRows: validRows.slice(0, 20),
      });
    }

    if (action === 'commit') {
      if (errors.length > 0 && body.strict !== false) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot import CSV: found ${errors.length} validation errors. Fix errors before committing or proceed with valid rows only.`,
            errors,
          },
          { status: 400 }
        );
      }

      const result = await commitCsvImport(
        business.id,
        validRows,
        session.user.name || 'CSV Importer'
      );

      return NextResponse.json({
        success: true,
        importedCount: result.count,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Expected "preview" or "commit".' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'CSV operation failed.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
