import { describe, it, expect } from 'vitest';
import {
  createStickyNoteTool,
  createShapeTool,
  createFrameTool,
  createConnectorTool,
  moveObjectTool,
  changeColorTool,
  updateTextTool,
  arrangeGridTool,
  resizeObjectTool,
  createDrawingTool,
  createTextTool,
  zoomToFitTool,
  findObjectsTool,
  getBoardStateTool,
  findOpenSpaceTool,
  deleteObjectsTool,
  alignObjectsTool,
  distributeObjectsTool,
  webSearchTool,
  generateContentTool,
  createTemplateTool,
  createMultipleObjectsTool,
  boardTools,
  openaiToolSchemas,
} from '../../src/lib/boardTools.js';

// Helper: validate schema accepts input
async function validates(tool, input) {
  const result = await tool.schema.parseAsync(input);
  return result;
}

// Helper: validate schema rejects input
async function rejects(tool, input) {
  await expect(tool.schema.parseAsync(input)).rejects.toThrow();
}

// --- boardTools array ---
describe('boardTools', () => {
  it('has 22 tools', () => {
    expect(boardTools).toHaveLength(22);
  });

  it('all tools have a name', () => {
    for (const tool of boardTools) {
      expect(tool.name).toBeTruthy();
    }
  });

  it('all tools have a description', () => {
    for (const tool of boardTools) {
      expect(tool.description).toBeTruthy();
    }
  });

  it('all tool names are unique', () => {
    const names = boardTools.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// --- openaiToolSchemas ---
describe('openaiToolSchemas', () => {
  it('has 22 entries matching boardTools', () => {
    expect(openaiToolSchemas).toHaveLength(22);
  });

  it('each entry has correct OpenAI function-calling structure', () => {
    for (const schema of openaiToolSchemas) {
      expect(schema.type).toBe('function');
      expect(schema.function).toHaveProperty('name');
      expect(schema.function).toHaveProperty('description');
      expect(schema.function).toHaveProperty('parameters');
    }
  });

  it('strips $schema key from parameters', () => {
    for (const schema of openaiToolSchemas) {
      expect(schema.function.parameters).not.toHaveProperty('$schema');
    }
  });

  it('parameters have type "object"', () => {
    for (const schema of openaiToolSchemas) {
      expect(schema.function.parameters.type).toBe('object');
    }
  });
});

// --- createStickyNote ---
describe('createStickyNoteTool schema', () => {
  it('accepts valid input', async () => {
    const result = await validates(createStickyNoteTool, {
      text: 'Hello', x: 100, y: 200, color: 'yellow',
    });
    expect(result.text).toBe('Hello');
  });

  it('accepts all valid colors', async () => {
    for (const color of ['yellow', 'pink', 'blue', 'green', 'purple', 'orange']) {
      await validates(createStickyNoteTool, { text: 'Test', x: 0, y: 0, color });
    }
  });

  it('rejects invalid color', async () => {
    await rejects(createStickyNoteTool, { text: 'Test', x: 0, y: 0, color: 'red' });
  });

  it('rejects missing text', async () => {
    await rejects(createStickyNoteTool, { x: 0, y: 0, color: 'yellow' });
  });

  it('rejects missing position', async () => {
    await rejects(createStickyNoteTool, { text: 'Test', color: 'yellow' });
  });
});

// --- createShape ---
describe('createShapeTool schema', () => {
  const validShape = { type: 'rectangle', x: 0, y: 0, width: 100, height: 100, color: '#fff' };

  it('accepts all 6 shape types', async () => {
    for (const type of ['rectangle', 'circle', 'triangle', 'diamond', 'hexagon', 'star']) {
      await validates(createShapeTool, { ...validShape, type });
    }
  });

  it('rejects invalid shape type', async () => {
    await rejects(createShapeTool, { ...validShape, type: 'pentagon' });
  });

  it('accepts optional text field', async () => {
    const result = await validates(createShapeTool, { ...validShape, text: 'Start' });
    expect(result.text).toBe('Start');
  });

  it('works without text (optional)', async () => {
    const result = await validates(createShapeTool, validShape);
    expect(result.text).toBeUndefined();
  });
});

// --- createFrame ---
describe('createFrameTool schema', () => {
  it('accepts valid input', async () => {
    await validates(createFrameTool, { title: 'Group A', x: 0, y: 0, width: 400, height: 300 });
  });

  it('rejects missing title', async () => {
    await rejects(createFrameTool, { x: 0, y: 0, width: 400, height: 300 });
  });
});

// --- createConnector ---
describe('createConnectorTool schema', () => {
  it('accepts valid connector', async () => {
    await validates(createConnectorTool, { fromId: 1, toId: 2, style: 'arrow' });
  });

  it('accepts all 3 styles', async () => {
    for (const style of ['arrow', 'line', 'dashed']) {
      await validates(createConnectorTool, { fromId: 1, toId: 2, style });
    }
  });

  it('accepts optional label', async () => {
    const result = await validates(createConnectorTool, {
      fromId: 1, toId: 2, style: 'arrow', label: 'Yes',
    });
    expect(result.label).toBe('Yes');
  });

  it('accepts optional color', async () => {
    await validates(createConnectorTool, {
      fromId: 1, toId: 2, style: 'arrow', color: '#667eea',
    });
  });

  it('rejects invalid style', async () => {
    await rejects(createConnectorTool, { fromId: 1, toId: 2, style: 'dotted' });
  });
});

// --- moveObject ---
describe('moveObjectTool schema', () => {
  it('accepts valid move', async () => {
    await validates(moveObjectTool, { objectIds: [1, 2], x: 100, y: 200 });
  });

  it('accepts relative flag', async () => {
    const result = await validates(moveObjectTool, { objectIds: [1], x: 50, y: -30, relative: true });
    expect(result.relative).toBe(true);
  });
});

// --- changeColor ---
describe('changeColorTool schema', () => {
  it('accepts valid input', async () => {
    await validates(changeColorTool, { objectIds: [1, 2, 3], color: 'pink' });
  });
});

// --- updateText ---
describe('updateTextTool schema', () => {
  it('accepts valid input', async () => {
    await validates(updateTextTool, { objectId: 5, newText: 'Updated!' });
  });
});

// --- arrangeGrid ---
describe('arrangeGridTool schema', () => {
  it('accepts valid grid config', async () => {
    await validates(arrangeGridTool, {
      objectIds: [1, 2, 3, 4], columns: 2, spacing: 20, startX: 0, startY: 0,
    });
  });
});

// --- resizeObject ---
describe('resizeObjectTool schema', () => {
  it('accepts valid resize', async () => {
    await validates(resizeObjectTool, { objectIds: [1], width: 200, height: 150 });
  });
});

// --- createDrawing ---
describe('createDrawingTool schema', () => {
  it('accepts valid drawing', async () => {
    await validates(createDrawingTool, {
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#ff0000',
    });
  });

  it('accepts optional strokeWidth', async () => {
    const result = await validates(createDrawingTool, {
      points: [{ x: 0, y: 0 }], color: '#000', strokeWidth: 5,
    });
    expect(result.strokeWidth).toBe(5);
  });
});

// --- createText ---
describe('createTextTool schema', () => {
  it('accepts valid input', async () => {
    await validates(createTextTool, { text: 'Hello', x: 50, y: 100 });
  });
});

// --- zoomToFit ---
describe('zoomToFitTool schema', () => {
  it('accepts empty object (zoom to all)', async () => {
    await validates(zoomToFitTool, {});
  });

  it('accepts specific object IDs', async () => {
    await validates(zoomToFitTool, { objectIds: [1, 2, 3] });
  });
});

// --- findObjects ---
describe('findObjectsTool schema', () => {
  it('accepts empty filter (find all)', async () => {
    await validates(findObjectsTool, {});
  });

  it('accepts type filter', async () => {
    await validates(findObjectsTool, { type: 'stickyNote' });
  });

  it('accepts combined filters', async () => {
    await validates(findObjectsTool, { type: 'shape', color: 'blue', textContains: 'test' });
  });

  it('rejects invalid type', async () => {
    await rejects(findObjectsTool, { type: 'invalid' });
  });
});

// --- getBoardState ---
describe('getBoardStateTool schema', () => {
  it('accepts empty object', async () => {
    await validates(getBoardStateTool, {});
  });
});

// --- findOpenSpace ---
describe('findOpenSpaceTool schema', () => {
  it('accepts width and height', async () => {
    await validates(findOpenSpaceTool, { width: 500, height: 400 });
  });
});

// --- deleteObjects ---
describe('deleteObjectsTool schema', () => {
  it('accepts array of IDs', async () => {
    await validates(deleteObjectsTool, { objectIds: [1, 2, 3] });
  });
});

// --- alignObjects ---
describe('alignObjectsTool schema', () => {
  it('accepts all 6 alignment options', async () => {
    for (const alignment of ['left', 'center', 'right', 'top', 'middle', 'bottom']) {
      await validates(alignObjectsTool, { objectIds: [1, 2], alignment });
    }
  });

  it('rejects invalid alignment', async () => {
    await rejects(alignObjectsTool, { objectIds: [1, 2], alignment: 'diagonal' });
  });
});

// --- distributeObjects ---
describe('distributeObjectsTool schema', () => {
  it('accepts 3+ objects', async () => {
    await validates(distributeObjectsTool, { objectIds: [1, 2, 3], direction: 'horizontal' });
  });

  it('rejects fewer than 3 objects', async () => {
    await rejects(distributeObjectsTool, { objectIds: [1, 2], direction: 'horizontal' });
  });

  it('accepts both directions', async () => {
    await validates(distributeObjectsTool, { objectIds: [1, 2, 3], direction: 'horizontal' });
    await validates(distributeObjectsTool, { objectIds: [1, 2, 3], direction: 'vertical' });
  });
});

// --- webSearch ---
describe('webSearchTool schema', () => {
  it('accepts a query string', async () => {
    await validates(webSearchTool, { query: 'React best practices 2024' });
  });
});

// --- generateContent ---
describe('generateContentTool schema', () => {
  it('accepts valid input', async () => {
    await validates(generateContentTool, { topic: 'AI', type: 'ideas', count: 5 });
  });

  it('rejects count below 1', async () => {
    await rejects(generateContentTool, { topic: 'AI', type: 'ideas', count: 0 });
  });

  it('rejects count above 10', async () => {
    await rejects(generateContentTool, { topic: 'AI', type: 'ideas', count: 11 });
  });
});

// --- createTemplate ---
describe('createTemplateTool schema', () => {
  it('accepts all 5 template types', async () => {
    for (const type of ['swot', 'userJourney', 'retrospective', 'kanban', 'proCon']) {
      await validates(createTemplateTool, { templateType: type });
    }
  });

  it('accepts optional topic', async () => {
    const result = await validates(createTemplateTool, { templateType: 'swot', topic: 'Q3 Sprint' });
    expect(result.topic).toBe('Q3 Sprint');
  });

  it('rejects invalid template type', async () => {
    await rejects(createTemplateTool, { templateType: 'timeline' });
  });
});

// --- createMultipleObjects ---
describe('createMultipleObjectsTool schema', () => {
  it('accepts array of mixed objects', async () => {
    await validates(createMultipleObjectsTool, {
      objects: [
        { type: 'stickyNote', text: 'Note 1', color: 'yellow' },
        { type: 'shape', shapeType: 'circle', color: '#fff' },
        { type: 'text', text: 'Label' },
        { type: 'frame', text: 'Group' },
      ],
    });
  });

  it('accepts objects with optional positions', async () => {
    await validates(createMultipleObjectsTool, {
      objects: [
        { type: 'stickyNote', text: 'A', x: 100, y: 200 },
        { type: 'stickyNote', text: 'B' },
      ],
    });
  });

  it('accepts large arrays', async () => {
    const objects = Array.from({ length: 100 }, (_, i) => ({
      type: 'stickyNote', text: `Note ${i}`,
    }));
    const result = await validates(createMultipleObjectsTool, { objects });
    expect(result.objects).toHaveLength(100);
  });

  it('rejects invalid object type', async () => {
    await rejects(createMultipleObjectsTool, {
      objects: [{ type: 'invalid' }],
    });
  });
});
