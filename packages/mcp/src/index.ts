import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  searchNewsTool,
  getArticleTool,
  summarizeArticleTool,
  getTrendingTool,
  getSourcesTool,
} from './tools/newsp.js';

const server = new Server(
  { name: 'fast-news-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      searchNewsTool,
      getArticleTool,
      summarizeArticleTool,
      getTrendingTool,
      getSourcesTool,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_news': {
        const { query, filters } = args as { query: string; filters?: object };
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Search for "${query}" would return semantic results`,
              filters,
            }, null, 2),
          }],
        };
      }
      case 'get_article': {
        const { id } = args as { id: string };
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, articleId: id }, null, 2),
          }],
        };
      }
      case 'summarize_article': {
        const { id, maxLength } = args as { id: string; maxLength?: number };
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Summary for article ${id} (max ${maxLength || 200} chars)`,
            }, null, 2),
          }],
        };
      }
      case 'get_trending': {
        const { category, limit } = args as { category?: string; limit?: number };
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              trending: [
                'GitHub Copilot',
                'Claude 4',
                'Grok 3',
                'Gemini Ultra',
                'Steam Deck 2',
              ].slice(0, limit || 10),
              category: category || 'all',
            }, null, 2),
          }],
        };
      }
      case 'get_sources': {
        const { category, company } = args as { category?: string; company?: string };
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              sources: [
                { name: 'GitHub Blog', category: 'Big Techs', company: 'GitHub' },
                { name: 'OpenAI Blog', category: 'AI Frontier', company: 'OpenAI' },
                { name: 'Steam News', category: 'Gaming', company: 'Steam' },
              ],
              filters: { category, company },
            }, null, 2),
          }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Fast News MCP Server running on stdio');
}

main().catch(console.error);
