/**
 * 🧠 KNOWLEDGE SYNC EDGE FUNCTION
 * Bidirectional learning: Mobile ↔ Server
 * 
 * Endpoints:
 * - POST /upload → Mobile sends compressed research to server
 * - GET /pull → Mobile fetches server-learned insights
 * - POST /crawl → Trigger server-side web research
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const RESEARCH_RATE_LIMIT = 10; // Max research requests per hour
const COMPRESSION_THRESHOLD = 0.7; // 70% compression minimum

interface CompressedKnowledge {
  domain: string;
  topic: string;
  summary: string;
  keywords: string[];
  examples: string[];
  metadata: {
    source: string;
    timestamp: string;
    confidence: number;
  };
}

interface KnowledgeSyncRequest {
  action: 'upload' | 'pull' | 'crawl';
  userId?: string;
  findings?: CompressedKnowledge[];
  query?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client (auth-aware for user-specific data)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[KnowledgeSync] ❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, findings, query }: KnowledgeSyncRequest = await req.json();
    console.log(`[KnowledgeSync] 📥 Action: ${action} from user: ${user.id.substring(0, 8)}...`);

    // ═══════════════════════════════════════════════════════
    // ACTION: UPLOAD - Mobile sends compressed research
    // ═══════════════════════════════════════════════════════
    if (action === 'upload') {
      if (!findings || findings.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No findings provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[KnowledgeSync] 📤 Uploading ${findings.length} findings from mobile`);

      // Store in knowledge_base table (create if not exists)
      const uploadedFindings = [];
      
      for (const finding of findings) {
        const { data, error } = await supabaseClient
          .from('knowledge_base')
          .insert({
            user_id: user.id,
            domain: finding.domain,
            topic: finding.topic,
            summary: finding.summary,
            keywords: finding.keywords,
            examples: finding.examples,
            source: finding.metadata.source,
            confidence: finding.metadata.confidence,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('[KnowledgeSync] ❌ Insert failed:', error);
          continue;
        }

        uploadedFindings.push(data);
        console.log(`[KnowledgeSync] ✅ Uploaded: ${finding.topic}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          uploaded: uploadedFindings.length,
          total: findings.length,
          message: `Uploaded ${uploadedFindings.length} knowledge entries`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════
    // ACTION: PULL - Mobile fetches server insights
    // ═══════════════════════════════════════════════════════
    if (action === 'pull') {
      console.log('[KnowledgeSync] 📥 Fetching server insights for mobile');

      // Fetch recent high-confidence findings
      const { data: insights, error } = await supabaseClient
        .from('knowledge_base')
        .select('*')
        .gte('confidence', 0.8) // High confidence only
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[KnowledgeSync] ❌ Fetch failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch insights' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[KnowledgeSync] ✅ Returning ${insights?.length || 0} insights`);

      return new Response(
        JSON.stringify({
          success: true,
          insights: insights || [],
          count: insights?.length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════
    // ACTION: CRAWL - Trigger server-side web research
    // ═══════════════════════════════════════════════════════
    if (action === 'crawl') {
      if (!query) {
        return new Response(
          JSON.stringify({ error: 'Query required for crawling' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[KnowledgeSync] 🔍 Starting server-side research: "${query}"`);

      // Check rate limit (user-specific)
      const { data: recentResearch } = await supabaseClient
        .from('research_history')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

      if (recentResearch && recentResearch.length >= RESEARCH_RATE_LIMIT) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded', 
            limit: RESEARCH_RATE_LIMIT,
            reset_in_minutes: 60 - Math.floor((Date.now() - new Date(recentResearch[0].created_at).getTime()) / 60000)
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Perform web research using DuckDuckGo API (free, no auth)
      try {
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`;
        const response = await fetch(searchUrl, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`DuckDuckGo returned ${response.status}`);
        }

        const data = await response.json();

        // Compress findings
        let findings = `Research: "${query}"\n\n`;
        
        if (data.AbstractText) {
          findings += `Summary:\n${data.AbstractText}\n\n`;
        }
        
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
          findings += `Key Insights:\n`;
          data.RelatedTopics.slice(0, 10).forEach((topic: any, i: number) => {
            if (topic.Text) {
              findings += `${i + 1}. ${topic.Text}\n`;
            }
          });
        }

        // Store research result
        const { error: insertError } = await supabaseClient
          .from('knowledge_base')
          .insert({
            user_id: user.id,
            domain: 'Web Research',
            topic: query,
            summary: data.AbstractText || 'No summary available',
            keywords: [query],
            examples: data.RelatedTopics?.slice(0, 5).map((t: any) => t.Text).filter(Boolean) || [],
            source: 'DuckDuckGo_Server_Crawl',
            confidence: 0.85,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[KnowledgeSync] ❌ Failed to store research:', insertError);
        }

        // Log research history
        await supabaseClient
          .from('research_history')
          .insert({
            user_id: user.id,
            query,
            status: 'success',
            created_at: new Date().toISOString(),
          });

        console.log(`[KnowledgeSync] ✅ Research completed: ${findings.length} chars`);

        return new Response(
          JSON.stringify({
            success: true,
            query,
            findings,
            source: 'DuckDuckGo',
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('[KnowledgeSync] ❌ Research failed:', error);
        
        // Log failed research
        await supabaseClient
          .from('research_history')
          .insert({
            user_id: user.id,
            query,
            status: 'failed',
            error_message: (error as Error).message,
            created_at: new Date().toISOString(),
          });

        return new Response(
          JSON.stringify({ 
            error: 'Research failed', 
            details: (error as Error).message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Invalid action
    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: upload, pull, or crawl' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[KnowledgeSync] ❌ Critical error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
