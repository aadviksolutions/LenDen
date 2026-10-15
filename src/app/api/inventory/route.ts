import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import {
  getProducts,
  createProduct,
  getInventoryValuation,
} from '@/lib/services/inventoryService';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get('query') || undefined;
    const category = searchParams.get('category') || undefined;
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const [products, valuation] = await Promise.all([
      getProducts(business.id, { query, category, lowStockOnly, includeArchived }),
      getInventoryValuation(business.id),
    ]);

    return NextResponse.json({
      success: true,
      products,
      valuation,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireTenantAccess();
    const body = await req.json();

    const product = await createProduct(
      business.id,
      {
        name: body.name,
        sku: body.sku,
        barcode: body.barcode,
        category: body.category,
        unit: body.unit,
        purchasePrice: body.purchasePrice,
        sellingPrice: body.sellingPrice,
        taxRate: body.taxRate,
        openingStock: body.openingStock,
        lowStockAlert: body.lowStockAlert,
        description: body.description,
      },
      session.user.name || 'User'
    );

    return NextResponse.json(
      {
        success: true,
        product,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create product.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
