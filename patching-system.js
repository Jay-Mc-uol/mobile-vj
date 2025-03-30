import { jsPlumb } from 'jsPlumb';

let instance;

export function initPatchingSystem() {
    console.log("Initializing jsPlumb instance...");
    instance = jsPlumb.getInstance({
        Container: "patching-canvas",
        DragOptions: { cursor: 'pointer', zIndex: 2000 },
        Connector: ["Bezier", { curviness: 50 }],
        PaintStyle: { stroke: "rgba(0,0,255,0.8)", lineWidth: 2 },
        EndpointStyle: { fill: "rgba(0,0,255,0.8)" },
    });

    console.log("jsPlumb instance initialized:", instance);

    instance.bind("connection", (info) => {
        console.log("Connected:", info.sourceId, "to", info.targetId);
    });

    // Automatically drag connectors when dragging nodes
    instance.bind("drag", (event) => {
        const sourceNode = event.source;
        const nodeId = sourceNode.id;

        console.log(`Dragging node: ${nodeId}`);
        // Trigger a repaint of the connectors that are linked to the dragged node
        const connections = instance.getConnections({ source: nodeId });
        connections.forEach(connection => {
            instance.repaint(connection);  // Repaint connector to adjust to the new node position
            console.log(`Repainting connector for node ${nodeId}`);
        });
    });

    // Repaint connectors after drag ends to ensure they're in the correct position
    instance.bind("dragend", (event) => {
        const sourceNode = event.source;
        const nodeId = sourceNode.id;

        console.log(`Drag ended for node: ${nodeId}`);
        const connections = instance.getConnections({ source: nodeId });

        connections.forEach(connection => {
            instance.repaint(connection);  // Final adjustment after dragging
            console.log(`Repainting connector after drag...`);
        });
    });
}

export function createNode(type) {
    const nodeId = `node-${Date.now()}`;
    const node = document.createElement('div');
    node.classList.add('node');
    node.id = nodeId;
    node.innerHTML = `<h3>${type.toUpperCase()} Node</h3>`;

    console.log(`Created node: ${nodeId}`);

    document.getElementById('patching-canvas').appendChild(node);

    // Make the node draggable and handle event logging
    jsPlumb.draggable(node, {
        containment: "parent",
        start: () => {
            console.log(`Starting to drag node: ${nodeId}`);
        },
        drag: (event) => {
            console.log(`Dragging node ${nodeId}:`, event);
            // This ensures jsPlumb connectors repaint as the node is dragged
            instance.repaintEverything();
        },
        stop: () => {
            console.log(`Drag stopped for node: ${nodeId}`);
        }
    });

    console.log(`Set draggable for node ${nodeId}`);

    // Add endpoints to the node for connections
    instance.addEndpoint(node, {
        anchors: ["RightMiddle"],
        isSource: true,
        isTarget: true
    });

    instance.addEndpoint(node, {
        anchors: ["LeftMiddle"],
        isSource: true,
        isTarget: true
    });

    console.log(`Endpoints added to node ${nodeId}`);
    return nodeId;
}
