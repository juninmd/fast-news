import { z } from 'zod';

export const searchNewsTool = {
  name: 'search_news',
  description: 'Search news articles using semantic vector search. Supports filtering by category, company, and date range.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query text' },
      filters: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          company: { type: 'string' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          limit: { type: 'number', default: 10 },
        },
      },
    },
    required: ['query'],
  },
};

export const getArticleTool = {
  name: 'get_article',
  description: 'Get a single article by ID with full content.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Article UUID' },
    },
    required: ['id'],
  },
};

export const summarizeArticleTool = {
  name: 'summarize_article',
  description: 'Generate an AI-powered summary of an article.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Article UUID' },
      maxLength: { type: 'number', default: 200 },
    },
    required: ['id'],
  },
};

export const getTrendingTool = {
  name: 'get_trending',
  description: 'Get trending topics and articles by category.',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Filter by category (optional)' },
      limit: { type: 'number', default: 10 },
    },
  },
};

export const getSourcesTool = {
  name: 'get_sources',
  description: 'List all available news sources with their categories and companies.',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      company: { type: 'string' },
    },
  },
};
