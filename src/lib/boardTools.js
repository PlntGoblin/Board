export const boardTools = [
  {
    name: "createStickyNote",
    description: "Create a sticky note on the board",
    input_schema: {
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
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["rectangle", "circle"], description: "Type of shape" },
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
    input_schema: {
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
    name: "moveObject",
    description: "Move an object to a new position. Can move multiple objects if objectIds is an array.",
    input_schema: {
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
    input_schema: {
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
    input_schema: {
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
    input_schema: {
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
    name: "getBoardState",
    description: "Get the current state of all objects on the board including their IDs, positions, types, colors, and text",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "deleteObjects",
    description: "Delete one or more objects from the board",
    input_schema: {
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
