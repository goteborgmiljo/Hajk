import React from "react";
import Observer from "react-event-observer";
import GestureIcon from "@material-ui/icons/Gesture";

// Views
import BaseWindowPlugin from "../BaseWindowPlugin";
import SketchView from "./views/SketchView";

// Models
import SketchModel from "./models/SketchModel";
import DrawModel from "../../models/DrawModel";

const Sketch = (props) => {
  // We're gonna need to keep track of the currently active draw-type
  const [activeDrawType, setActiveDrawType] = React.useState("Polygon");

  // The local observer will handle the communication between models and views.
  const [localObserver] = React.useState(() => Observer());

  // We need a model used to interact with the map etc. We want to
  // keep the view free from direct interactions.
  // There's a possibility that this model won't be needed since most
  // (if not all) of the functionality should exist in the core Draw-model.
  const [sketchModel] = React.useState(
    () =>
      new SketchModel({
        localObserver: localObserver,
        app: props.app,
        options: props.options,
      })
  );

  // We're also gonna need a drawModel to handle all draw functionality
  const [drawModel] = React.useState(
    () =>
      new DrawModel({
        layerName: "sketchLayer",
        map: props.map,
        observer: localObserver,
      })
  );

  // We're gonna need to catch if the user closes the window, and make sure to
  // disable the draw interaction if it is active.
  const onWindowHide = () => {
    drawModel.toggleDrawInteraction("");
  };
  // If the user opens the window again, we have to make sure to toggle the draw-
  // interaction back to whatever it was before the user closed it.
  const onWindowShow = () => {
    drawModel.toggleDrawInteraction(activeDrawType);
  };

  // We're rendering the view in a BaseWindowPlugin, since this is a
  // "standard" plugin.
  return (
    <BaseWindowPlugin
      {...props}
      type="Sketch"
      custom={{
        icon: <GestureIcon />,
        title: "Rita",
        description: "Skapa dina helt egna geometrier!",
        height: "dynamic",
        width: 350,
        onWindowHide: onWindowHide,
        onWindowShow: onWindowShow,
      }}
    >
      <SketchView
        model={sketchModel}
        drawModel={drawModel}
        options={props.options}
        localObserver={localObserver}
        activeDrawType={activeDrawType}
        setActiveDrawType={setActiveDrawType}
      />
    </BaseWindowPlugin>
  );
};

export default Sketch;