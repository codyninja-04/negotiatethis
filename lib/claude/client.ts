import Anthropic from '@anthropic-ai/sdk'

// One shared client for the counterparty and the debrief.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'
