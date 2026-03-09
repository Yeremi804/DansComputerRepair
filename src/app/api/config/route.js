import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || ''
    const raw = await req.text()

    if (!raw) {
      return new Response(JSON.stringify({ error: 'Empty request body' }), { status: 400 })
    }

    let body
    try {
      body = JSON.parse(raw)
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
    }

    console.log('Received body for /api/config:', body)

    const toNull = (v) => (v === undefined || v === null || v === '') ? null : v

    const row = {
      name: toNull(body['Name']),
      phone: toNull(body['Phone Number']),
      email: toNull(body['Email Address']),
      budget_range: toNull(body['Budget Range']),
      intended_use: toNull(body['Intended Use']),
      cpu: toNull(body['CPU']),
      gpu: toNull(body['GPU']),
      motherboard: toNull(body['Motherboard']),
      memory: toNull(body['Memory']),
      storage: toNull(body['Storage']),
      psu: toNull(body['PSU']),
      case: toNull(body['Case']),
      cooling: toNull(body['Cooling']),
      operating_system: toNull(body['Operating System']),
      networking: toNull(body['Networking']),
      other_requests: toNull(body.otherRequests),
      sms_consent: body.sms_consent === true,
      // new orders must default to 'Pending' instead of 'Completed'
      Status: 'Pending',
    }

    console.log('Prepared DB row for insert:', row)

    const { data, error } = await supabase.from('Configuration_Form').insert([row]).select().single()

    if (error) {
      console.error('Supabase insert error', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify(data), { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}