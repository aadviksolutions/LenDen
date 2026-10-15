import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { getCustomerById, updateCustomer } from '@/lib/services/customerService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireTenantAccess();
    const { id } = await params;

    const customer = await getCustomerById(business.id, id);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve customer.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireTenantAccess();
    const { id } = await params;
    const body = await req.json();

    const customer = await updateCustomer(business.id, id, body);

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update customer.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
