import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Helper: strip $schema key from zodToJsonSchema output (OpenAI doesn't need it)
function toParams(schema) {
  const { $schema, ...params } = zodToJsonSchema(schema);
  return params;
}

export const createStickyNoteTool = tool(
  async (args) => args,
  {
    name: "createStickyNote",
    description: "Create a sticky note on the board",
    schema: z.object({
      text: z.string().describe("Text content of the sticky note"),
      x: z.number().describe("X position on the board"),
      y: z.number().describe("Y position on the board"),
      color: z
        .enum(["yellow", "pink", "blue", "green", "purple", "orange"])
        .describe("Color of the sticky note"),
    }),
  }
);

export const createShapeTool = tool(
  async (args) => args,
  {
    name: "createShape",
    description: "Create a shape (rectangle, circle, triangle, diamond, hexagon, or star) on the board",
    schema: z.object({
      type: z
        .enum(["rectangle", "circle", "triangle", "diamond", "hexagon", "star"])
        .describe("Type of shape"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      width: z.number().describe("Width of the shape"),
      height: z.number().describe("Height of the shape"),
      color: z.string().describe("Fill color of the shape (hex or named color)"),
    }),
  }
);

export const createFrameTool = tool(
  async (args) => args,
  {
    name: "createFrame",
    description: "Create a frame container on the board to group or label a section",
    schema: z.object({
      title: z.string().describe("Title label of the frame"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      width: z.number().describe("Width of the frame"),
      height: z.number().describe("Height of the frame"),
    }),
  }
);

export const createConnectorTool = tool(
  async (args) => args,
  {
    name: "createConnector",
    description:
      "Create a connector (arrow or line) between two objects on the board. Connection points are calculated from object centers automatically.",
    schema: z.object({
      fromId: z.number().describe("ID of the source object to connect from"),
      toId: z.number().describe("ID of the target object to connect to"),
      style: z
        .enum(["arrow", "line", "dashed"])
        .describe("Visual style of the connector"),
      color: z
        .string()
        .optional()
        .describe("Color of the connector (e.g. '#667eea', 'white'). Defaults to white."),
    }),
  }
);

export const moveObjectTool = tool(
  async (args) => args,
  {
    name: "moveObject",
    description:
      "Move one or more objects to a new position. Use relative=true for offsets from current position.",
    schema: z.object({
      objectIds: z
        .array(z.number())
        .describe("Array of object IDs to move"),
      x: z.number().describe("New X position, or X offset if relative=true"),
      y: z.number().describe("New Y position, or Y offset if relative=true"),
      relative: z
        .boolean()
        .optional()
        .describe("If true, x and y are offsets from current position"),
    }),
  }
);

export const changeColorTool = tool(
  async (args) => args,
  {
    name: "changeColor",
    description: "Change the fill color of one or more objects",
    schema: z.object({
      objectIds: z
        .array(z.number())
        .describe("Array of object IDs to recolor"),
      color: z.string().describe("New color (hex or named color)"),
    }),
  }
);

export const updateTextTool = tool(
  async (args) => args,
  {
    name: "updateText",
    description: "Update the text content of an object",
    schema: z.object({
      objectId: z.number().describe("ID of the object to update"),
      newText: z.string().describe("New text content"),
    }),
  }
);

export const arrangeGridTool = tool(
  async (args) => args,
  {
    name: "arrangeGrid",
    description: "Arrange a set of objects in a grid layout",
    schema: z.object({
      objectIds: z
        .array(z.number())
        .describe("Array of object IDs to arrange"),
      columns: z.number().describe("Number of columns in the grid"),
      spacing: z.number().describe("Spacing in pixels between elements"),
      startX: z.number().describe("Starting X position for the grid"),
      startY: z.number().describe("Starting Y position for the grid"),
    }),
  }
);

export const resizeObjectTool = tool(
  async (args) => args,
  {
    name: "resizeObject",
    description: "Resize one or more objects to a new width and height",
    schema: z.object({
      objectIds: z
        .array(z.number())
        .describe("Array of object IDs to resize"),
      width: z.number().describe("New width in pixels"),
      height: z.number().describe("New height in pixels"),
    }),
  }
);

export const createDrawingTool = tool(
  async (args) => args,
  {
    name: "createDrawing",
    description:
      "Draw a freehand path on the board using a series of x,y points. Use for sketches, underlines, circles, or simple illustrations.",
    schema: z.object({
      points: z
        .array(
          z.object({
            x: z.number().describe("X coordinate"),
            y: z.number().describe("Y coordinate"),
          })
        )
        .describe("Array of {x, y} points that form the path"),
      color: z.string().describe("Stroke color (e.g. '#ffffff', 'yellow')"),
      strokeWidth: z
        .number()
        .optional()
        .describe("Width of the stroke in pixels (default 3)"),
    }),
  }
);

export const createTextTool = tool(
  async (args) => args,
  {
    name: "createText",
    description: "Create a standalone text label on the board",
    schema: z.object({
      text: z.string().describe("Text content"),
      x: z.number().describe("X position on the board"),
      y: z.number().describe("Y position on the board"),
    }),
  }
);

export const zoomToFitTool = tool(
  async (args) => args,
  {
    name: "zoomToFit",
    description:
      "Zoom and pan the viewport to show all objects, or specific objects if objectIds is provided. Always call this at the end of creating a template.",
    schema: z.object({
      objectIds: z
        .array(z.number())
        .optional()
        .describe(
          "Optional array of object IDs to zoom to. If omitted, zooms to fit all objects."
        ),
    }),
  }
);

export const getBoardStateTool = tool(
  async (args) => args,
  {
    name: "getBoardState",
    description:
      "Get the current state of all objects on the board including IDs, positions, types, colors, and text. Only call this if the board state provided in the system prompt seems stale.",
    schema: z.object({}),
  }
);

export const findOpenSpaceTool = tool(
  async (args) => args,
  {
    name: "findOpenSpace",
    description:
      "Find an unoccupied area on the board large enough to fit content of the given dimensions. Returns x,y coordinates for placement that won't overlap existing objects. ALWAYS call this before creating templates or multiple objects.",
    schema: z.object({
      width: z.number().describe("Required width of the open space in pixels"),
      height: z.number().describe("Required height of the open space in pixels"),
    }),
  }
);

export const deleteObjectsTool = tool(
  async (args) => args,
  {
    name: "deleteObjects",
    description: "Delete one or more objects from the board by their IDs",
    schema: z.object({
      objectIds: z
        .array(z.number())
        .describe("Array of object IDs to delete"),
    }),
  }
);

export const alignObjectsTool = tool(
  async (args) => args,
  {
    name: "alignObjects",
    description: "Align multiple objects along a common edge or axis. Use 'left'/'center'/'right' for horizontal alignment, 'top'/'middle'/'bottom' for vertical alignment.",
    schema: z.object({
      objectIds: z.array(z.number()).describe("Array of object IDs to align (at least 2)"),
      alignment: z
        .enum(["left", "center", "right", "top", "middle", "bottom"])
        .describe("Alignment: left/center/right aligns horizontally, top/middle/bottom aligns vertically"),
    }),
  }
);

export const distributeObjectsTool = tool(
  async (args) => args,
  {
    name: "distributeObjects",
    description: "Distribute objects evenly along horizontal or vertical axis, making equal gaps between them. Requires at least 3 objects.",
    schema: z.object({
      objectIds: z.array(z.number()).min(3).describe("At least 3 object IDs to distribute evenly"),
      direction: z.enum(["horizontal", "vertical"]).describe("Axis to distribute along"),
    }),
  }
);

export const webSearchTool = tool(
  async (args) => args,
  {
    name: "webSearch",
    description: "Search the web for current information to use as content on the board. Returns relevant results. Use when the user wants research-based content, current events, or real facts placed as sticky notes.",
    schema: z.object({
      query: z.string().describe("Search query to look up on the web"),
    }),
  }
);

export const generateContentTool = tool(
  async (args) => args,
  {
    name: "generateContent",
    description: "Generate a list of content items (ideas, risks, features, action items, questions, etc.) for a given topic. Returns items to place as sticky notes on the board.",
    schema: z.object({
      topic: z.string().describe("The subject to generate content about"),
      type: z.string().describe("Type of content to generate (e.g. 'ideas', 'risks', 'action items', 'features', 'questions', 'strengths')"),
      count: z.number().min(1).max(10).describe("Number of items to generate (1-10)"),
    }),
  }
);

// Ordered list of all board tools
export const boardTools = [
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
  getBoardStateTool,
  findOpenSpaceTool,
  deleteObjectsTool,
  alignObjectsTool,
  distributeObjectsTool,
  webSearchTool,
  generateContentTool,
];

// OpenAI function-calling format — generated from Zod schemas
export const openaiToolSchemas = boardTools.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: toParams(t.schema),
  },
}));
