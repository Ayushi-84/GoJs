import React,{forwardRef,useRef,useImperativeHandle,useCallback,useState} from 'react';
import * as go from 'gojs';
import { ReactDiagram } from 'gojs-react';
import './App.css'; 

const $ = go.GraphObject.make;

const App=forwardRef(
  (
    {
      nodeDataArray = [],
      linkDataArray = [],
    },
    ref
  ) => {

    const canvasRef = useRef();
    const [selectedLink,setSelectedLink]=useState(null)
    const [position,setPosition]=useState(null)
    var i=4;

    const linkClickedWrapper = useCallback(
      (e, link) => {
        const model = canvasRef.current.getDiagram().model;
        var p = e.diagram.transformDocToView(
          new go.Point(e.documentPoint.x, e.documentPoint.y)
        );
            p.x += 100;
        
            const x = p.x;
            const y = p.y;
            const xStr = x.toString();
            const yStr = y.toString();
        
            model.addNodeData({
              key:i,
              text:'new node',
              color:'rgb(155,125,118)',
              loc: xStr + " " + yStr,
              strokeColor:'rgba(155,125,118,0.1)'
            });
            var linkdata = {
              from: link.ub.to, // or just: fromData.id
              to:i,
            };
            model.addLinkData(linkdata);
         i++;
      },
      []
    );

    const defaultLinkConfig = {
      routing: go.Link.Orthogonal,
        toPortId: "to-port",
        fromPortId: "from-port",
        fromEndSegmentLength: 20,
        toEndSegmentLength: 30,
        toShortLength: 10,
        corner: 15,
        selectable: false,
      };

      function linkLinearBrush(link) {
        var b = new go.Brush(go.Brush.Linear);
        var fp = link.fromPort.getDocumentPoint(go.Spot.Center);
        var tp = link.toPort.getDocumentPoint(go.Spot.Center);
        var right = (tp.x > fp.x);
        var down = (tp.y > fp.y);
        if (right) {
          if (down) {
            b.start = go.Spot.TopLeft;
            b.end = go.Spot.BottomRight;
          } else {
            b.start = go.Spot.BottomLeft;
            b.end = go.Spot.TopRight;
          }
        } else {  // leftward
          if (down) {
            b.start = go.Spot.TopRight;
            b.end = go.Spot.BottomLeft;
          } else {
            b.start = go.Spot.BottomRight;
            b.end = go.Spot.TopLeft;
          }
        }
        b.addColorStop(0.0,'red');
        b.addColorStop(0.5,'green');
        b.addColorStop(1.0,'blue');
        return b;
      }

      const node=
      $(go.Node, 'Auto',
      {
        locationSpot: go.Spot.Center,
        click: (e, node) => {
            var diagram = node.diagram;
            diagram.startTransaction("highlight");
            diagram.clearHighlighteds();
            node.findLinksOutOf().each(l => l.isHighlighted = true);
            node.findNodesOutOf().each(n => n.isHighlighted = true);
            diagram.commitTransaction("highlight");
          }
      },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Ellipse',
          { name: 'SHAPE', fill: 'white', strokeWidth: 0,width:80,height:60 },
          new go.Binding('fill', 'strokeColor')),
        $(go.TextBlock,
          { margin: 8,
            textAlign: "center",
            overflow: go.TextBlock.OverflowEllipsis,
            maxSize: new go.Size(200, 50),
            stroke: "#fff",
            font: "16px Proxima Nova"},
          new go.Binding('text').makeTwoWay(),
          new go.Binding('stroke','color'),
        ),
        $(go.Shape, "Ellipse",
        { isPanelMain: true, spot1: go.Spot.TopLeft, spot2: go.Spot.BottomRight },
        { strokeWidth: 4, stroke: "red", fill: null },
        new go.Binding('stroke','color'),
        new go.Binding("opacity", "isHighlighted", h => h ? 1.0 : 0.0)
            .ofObject())
            
      );
   
  
      const linkTemplate=
    $(go.Link,
      defaultLinkConfig,
      { toShortLength: 8,
        relinkableFrom: true, relinkableTo: true,
        reshapable: true, resegmentable: true,
        click: linkClickedWrapper
        }, 
      $(go.Shape,
        {
          toArrow: "Feather",
          strokeWidth: 3,
        },
        new go.Binding("stroke", "", linkLinearBrush).ofObject(),
        new go.Binding("stroke", "isHighlighted", h => h ? "red" : linkLinearBrush)
            .ofObject(),
        new go.Binding("strokeWidth", "isHighlighted", h => h ? 4 : 3)
            .ofObject()),
    );


    const initDiagram = useCallback(() => {
      let d = $(go.Diagram, {
        "undoManager.isEnabled": true,
        "linkingTool.direction": go.LinkingTool.ForwardsOnly,
        "linkingTool.isEnabled": false,
        // fixedBounds: new go.Rect(0, 0, 640, 480), // document is always 500x300 units
        layout: $(go.LayeredDigraphLayout, {
          layerSpacing: 200,
          isOngoing: false,
          isInitial: false,
        }),
        allowZoom: false,
        allowVerticalScroll: false,
        allowHorizontalScroll: false,
      });
      d.model = new go.GraphLinksModel({
        linkKeyProperty: "key",
        nodeDataArray,
        linkDataArray,
      });
      d.nodeTemplate = node;
      d.linkTemplate = linkTemplate;
      d.toolManager.linkingTool.temporaryLink = $(
        go.Link,
        {
          layerName: "Tool",
          routing: go.Link.Orthogonal,
          corner: 30,
        },
        $(go.Shape, {
          strokeWidth: 2,
          stroke: "#3A4EFF",
          strokeDashArray: null,
        })
      );
      d.toolManager.linkingTool.temporaryFromNode = $(go.Node, {
        layerName: "Tool",
        selectable: false,
      });
      d.toolManager.linkingTool.temporaryToNode = $(go.Node, {
        layerName: "Tool",
        selectable: false,
      });
      d.validCycle = go.Diagram.CycleNotDirected;
      return d;
    }, [linkClickedWrapper, node]);
    useImperativeHandle(ref, () => ({
      getModelJSON: () => canvasRef.current.getDiagram().model.toJson(),
      loadModelJSON: (json) =>
        (canvasRef.current.getDiagram().model = go.Model.fromJson(json)),
      createNewNode: (data) => {
        const model = canvasRef.current.getDiagram().model;
        // if (!data || !data.src) return alert('Please enter a valid src for custom node');
        const nodeData = {
          key:
            data.key ||
            `Node_${
              canvasRef.current.getDiagram().model.nodeDataArray.length + 1
            }`,
          src: data.src,
          desc: data.desc,
          loc: data.loc,
          category: data.category || "",
        };
        model.addNodeData(nodeData);
        if (data.from)
          model.addLinkData({
            to: data.key,
            from: data.from,
            status: +data.status || null,
          });
        return nodeData;
      },
      autoAlign: () => canvasRef.current.getDiagram().layoutDiagram(true),
      findNodeForData: (data) =>
        canvasRef.current.getDiagram().findNodeForData(data),
      deleteNodeForData: (nodeData, onDelete = () => {}) => {
        const diagram = canvasRef.current.getDiagram();

        // Find the node by its data
        const node = diagram.findNodeForData(nodeData);

        // Remove the node from the model
        if (node !== null) {
          const links = node.findLinksConnected();
          let linkDataToDelete = [];

          // Collect link data to be deleted
          links.each(function (link) {
            linkDataToDelete.push(link.data);
          });

          // Remove the node and link data from the model
          diagram.model.startTransaction("deleteNode");
          diagram.model.removeNodeData(nodeData);
          diagram.model.removeLinkDataCollection(linkDataToDelete);
          diagram.model.commitTransaction("deleteNode");

          onDelete(nodeData, linkDataToDelete);
        }
      },
      deleteLinkForData: (linkData) => {
        const diagram = canvasRef.current.getDiagram();

        diagram.model.startTransaction("deleteLink");
        diagram.model.removeLinkData(linkData);
        diagram.model.commitTransaction("deleteLink");
      },
      addLinkData: (linkData) => {
        const diagram = canvasRef.current.getDiagram();
        diagram.model.addLinkData(linkData);
      },
      nodeDataArray: () => {
        const diagram = canvasRef.current.getDiagram();
        return diagram.model.nodeDataArray;
      },
      linkDataArray: () => {
        const diagram = canvasRef.current.getDiagram();
        return diagram.model.linkDataArray;
      },
    }));

  return (
    <div className='container'>
      <ReactDiagram
       ref={canvasRef}
        initDiagram={initDiagram}
        divClassName='diagram-component'
        nodeDataArray={[
          { key: 0, text: 'Alpha', color: 'rgb(255,0,0)', loc: '0 0',strokeColor:'rgba(255,0,0,0.1)' },
          { key: 1, text: 'Beta', color: 'rgb(0,153,0)', loc: '150 0',strokeColor:'rgba(0,255,0,0.1)' },
          { key: 2, text: 'Gamma', color: 'rgb(0,0,255)', loc: '0 150',strokeColor:'rgba(0,0,255,0.1)' },
          { key: 3, text: 'Delta', color: 'rgb(204,0,204)', loc: '150 150',strokeColor:'rgba(255,51,255,0.1)' }
        ]}
        linkDataArray={[
          { key: -1, from: 0, to: 1 },
          { key: -2, from: 0, to: 2 },
          { key: -3, from: 1, to: 3 },
          { key: -4, from: 2, to: 3 },
          { key: -5, from: 3, to: 0 }
        ]}
      />
    </div>
  );
}
)

export default App;
