import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Create a client with the user's token to verify they're admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin
    const { data: profile } = await userClient.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can generate invite links' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Generate an invite link for the email
    const siteUrl = req.headers.get('origin') || 'https://queen-hearts-ledger.lovable.app'
    
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email.trim(),
      options: {
        redirectTo: `${siteUrl}/reset-password`,
      },
    })

    if (error) {
      console.error('Error generating invite link:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Replace the localhost redirect in the action_link with the actual site URL
    let actionLink = data.properties?.action_link || ''
    if (actionLink) {
      // The action_link has redirect_to pointing to localhost, fix it
      const url = new URL(actionLink)
      url.searchParams.set('redirect_to', `${siteUrl}/reset-password`)
      actionLink = url.toString()
    }
    
    return new Response(JSON.stringify({ 
      invite_link: actionLink,
      email: email.trim()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
