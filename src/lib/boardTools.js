export const boardTools = [
  {
    name: "createStickyNote",
    description: "Create a sticky note on the board",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text content of the sticky note" },
        x: { type: "number", description: "X position on the board" },
        y: { type: "number", description: "Y position on the board" },
        color: {
          type: "string",
          description: "Color of the sticky note",
          enum: ["yellow", "pink", "blue", "green", "purple", "orange"],
        },
      },
      required: ["text", "x", "y", "color"],
    },
  },
  {
    name: "createShape",
    description: "Create a shape (rectangle or circle) on the board",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["rectangle", "circle", "triangle", "diamond", "hexagon", "star"], description: "Type of shape" },
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        width: { type: "number", description: "Width of the shape" },
        height: { type: "number", description: "Height of the shape" },
        color: { type: "string", description: "Fill color of the shape" },
      },
      required: ["type", "x", "y", "width", "height", "color"],
    },
  },
  {
    name: "createFrame",
    description: "Create a frame container on the board",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the frame" },
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        width: { type: "number", description: "Width of the frame" },
        height: { type: "number", description: "Height of the frame" },
      },
      required: ["title", "x", "y", "width", "height"],
    },
  },
  {
    name: "createConnector",
    description: "Create a connector (arrow or line) between two objects on the board. Calculates connection points from object centers automatically.",
    parameters: {
      type: "object",
      properties: {
        fromId: { type: "number", description: "ID of the source object to connect from" },
        toId: { type: "number", description: "ID of the target object to connect to" },
        style: {
          type: "string",
          description: "Style of the connector",
          enum: ["arrow", "line", "dashed"],
        },
        color: { type: "string", description: "Color of the connector (e.g. '#667eea', 'white'). Defaults to white." },
      },
      required: ["fromId", "toId", "style"],
    },
  },
  {
    name: "moveObject",
    description: "Move an object to a new position. Can move multiple objects if objectIds is an array.",
    parameters: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of object IDs to move",
        },
        x: { type: "number", description: "New X position (or X offset if relative)" },
        y: { type: "number", description: "New Y position (or Y offset if relative)" },
        relative: { type: "boolean", description: "If true, x and y are offsets from current position" },
      },
      required: ["objectIds", "x", "y"],
    },
  },
  {
    name: "changeColor",
    description: "Change the color of one or more objects",
    parameters: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of object IDs to recolor",
        },
        color: { type: "string", description: "New color" },
      },
      required: ["objectIds", "color"],
    },
  },
  {
    name: "updateText",
    description: "Update the text content of an object",
    parameters: {
      type: "object",
      properties: {
        objectId: { type: "number", description: "ID of the object to update" },
        newText: { type: "string", description: "New text content" },
      },
      required: ["objectId", "newText"],
    },
  },
  {
    name: "arrangeGrid",
    description: "Arrange selected objects in a grid layout",
    parameters: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of object IDs to arrange",
        },
        columns: { type: "number", description: "Number of columns in the grid" },
        spacing: { type: "number", description: "Spacing between elements" },
        startX: { type: "number", description: "Starting X position for the grid" },
        startY: { type: "number", description: "Starting Y position for the grid" },
      },
      required: ["objectIds", "columns", "spacing", "startX", "startY"],
    },
  },
  {
    name: "resizeObject",
    description: "Resize one or more objects to a new width and height",
    parameters: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of object IDs to resize",
        },
        width: { type: "number", description: "New width" },
        height: { type: "number", description: "New height" },
      },
      required: ["objectIds", "width", "height"],
    },
  },
  {
    name: "createDrawing",
    description: "Draw a freehand path on the board by specifying a series of x,y points. Use this to sketch simple illustrations like icons, doodles, underlines, circles, arrows, or simple figures. Each point is relative to the board coordinate system.",
    parameters: {
      type: "object",
      properties: {
        points: {
          type: "array",
          items: {
            type: "object",
            properties: {
              x: { type: "number", description: "X coordinate" },
              y: { type: "number", description: "Y coordinate" },
            },
            required: ["x", "y"],
          },
          description: "Array of {x, y} points that form the path",
        },
        color: { type: "string", description: "Stroke color (e.g. '#ffffff', 'yellow')" },
        strokeWidth: { type: "number", description: "Width of the stroke (default 3)" },
      },
      required: ["points", "color"],
    },
  },
  {
    name: "createText",
    description: "Create a text object on the board",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text content" },
        x: { type: "number", description: "X position on the board" },
        y: { type: "number", description: "Y position on the board" },
      },
      required: ["text", "x", "y"],
    },
  },
  {
    name: "zoomToFit",
    description: "Zoom and pan the viewport to show all objects on the board, or specific objects if objectIds is provided",
    parameters: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "number" },
          description: "Optional array of object IDs to zoom to. If omitted, zooms to fit all objects.",
        },
      },
      required: [],
    },
  },
  {
    name: "getBoardState",
    description: "Get the current state of all objects on the board including their IDs, positions, types, colors, and text",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "findOpenSpace",
    description: "Find an unoccupied area on the board large enough to fit content of the given width and height. Returns x,y coordinates for placement that won't overlap existing objects. ALWAYS call this before creating templates or multiple objects.",
    parameters: {
      type: "object",
      properties: {
        width: { type: "number", description: "Required width of the open space" },
        height: { type: "number", description: "Required height of the open space" },
      },
      required: ["width", "height"],
    },
  },
  {
    name: "deleteObjects",
    description: "Delete one or more objects from the board",
    parameters: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of object IDs to delete",
        },
      },
      required: ["objectIds"],
    },
  },
];
