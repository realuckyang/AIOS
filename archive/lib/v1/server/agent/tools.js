export const TOOLS = [{
  type: 'function',
  name: 'bash',
  description: 'Run a bash command.',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to execute.' },
      cwd: { type: 'string', description: 'Optional working directory.' },
      timeout: { type: 'number', description: 'Timeout in seconds, from 1 to 600.' },
      summary: { type: 'string', description: 'Short description shown to the user.' },
    },
    required: ['command', 'summary'],
  },
}];
