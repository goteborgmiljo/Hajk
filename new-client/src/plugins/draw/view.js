import React, { Component } from "react";
import Observer from "react-event-observer";
import DrawModel from "./model.js";
import { createPortal } from "react-dom";
import "./style.css";

class Draw extends Component {
  constructor() {
    super();
    this.toggle = this.toggle.bind(this);
    this.state = {
      toggled: false
    };
  }

  componentDidMount() {
    this.observer = Observer();
    this.observer.subscribe("myEvent", message => {
      console.log(message);
    });
    this.drawModel = new DrawModel({
      map: this.props.tool.map,
      app: this.props.tool.app,
      observer: this.observer
    });
    this.props.tool.instance = this;
  }

  open() {
    this.setState({
      toggled: true
    });
  }

  close() {
    this.setState({
      toggled: false
    });
  }

  minimize() {
    this.setState({
      toggled: false
    });
  }

  toggle() {
    if (!this.state.toggled) {
      this.props.toolbar.hide();
    }
    this.setState({
      toggled: !this.state.toggled
    });
    this.props.tool.app.togglePlugin("draw");
  }

  getActiveClass() {
    return this.state.toggled
      ? "tool-toggle-button active"
      : "tool-toggle-button";
  }

  getVisibilityClass() {
    return this.state.toggled
      ? "tool-panel draw-panel"
      : "tool-panel draw-panel hidden";
  }

  renderPanel() {
    return createPortal(
      <div className={this.getVisibilityClass()}>
        <div className="header">
          <i
            className="fa fa-close pull-right big"
            onClick={() => {
              this.toggle();
            }}
          />
          <h1>Draw</h1>
        </div>
        <div className="tool-panel-content">
          <div>Draw</div>
        </div>
      </div>,
      document.getElementById("map")
    );
  }

  render() {
    return (
      <div>
        <div className={this.getActiveClass()} onClick={this.toggle}>
          <i className="fa fa-icon fa-pencil icon" />
          <i className="tool-text">Rita</i>
        </div>
        {this.renderPanel()}
      </div>
    );
  }
}

export default Draw;
