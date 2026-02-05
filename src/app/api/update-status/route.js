import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const body = await request.json();
  const { id, source, newStatus } = body;
  if (!id || !source || !newStatus) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let table = '';
  let idField = '';
  if (source === 'Configuration_Form') {
    table = 'Configuration_Form';
    idField = 'id';
  } else if (source === 'service_requests') {
    table = 'service_requests';
    idField = 'serial_id'; // Use serial_id for service_requests
  } else {
    table = 'Admin_Page_Order';
    idField = 'ID';
  }

  const { error } = await supabase
    .from(table)
    .update({ Status: newStatus })
    .eq(idField, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
