import React from "react";
import "./App.scss";
import AddTodo from "./components/AddTodo";
import TodoList from "./components/TodoList";

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      todos: [],
      isConnected: false,
      error: null,
    };

    this.socket = null;
    this.reconnectTimeout = null;
  }

  componentDidMount() {
    this.connectWebSocket();
  }

  componentWillUnmount() {
    clearTimeout(this.reconnectTimeout);

    if (this.socket) {
      this.socket.close();
    }
  }

  getWebSocketUrl() {
    if (process.env.REACT_APP_WS_URL) {
      return process.env.REACT_APP_WS_URL;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const port = process.env.REACT_APP_WS_PORT || "3000";
    const host = process.env.REACT_APP_WS_HOST || `${window.location.hostname}:${port}`;

    return `${protocol}://${host}/ws`;
  }

  connectWebSocket() {
    if (!window.WebSocket) {
      this.setState({
        error: "WebSocket is not available in this environment",
      });
      return;
    }

    this.socket = new WebSocket(this.getWebSocketUrl());

    this.socket.onopen = () => {
      this.setState({
        isConnected: true,
        error: null,
      });
      this.sendMessage({ type: "todos:list" });
    };

    this.socket.onmessage = (event) => {
      let message;

      try {
        message = JSON.parse(event.data);
      } catch (error) {
        this.setState({
          error: "Invalid WebSocket message",
        });
        return;
      }

      if (message.type === "todos:list") {
        this.setState({
          todos: message.data || [],
        });
      }

      if (message.type === "error") {
        this.setState({
          error: message.message,
        });
      }
    };

    this.socket.onclose = () => {
      this.setState({
        isConnected: false,
      });
      this.reconnectTimeout = setTimeout(() => this.connectWebSocket(), 2000);
    };

    this.socket.onerror = () => {
      this.setState({
        error: "WebSocket connection error",
      });
    };
  }

  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  handleAddTodo = (value) => {
    this.sendMessage({
      type: "todos:create",
      payload: {
        text: value,
      },
    });
  };

  render() {
    return (
      <div className="App container">
        <div className="container-fluid">
          <div className="row">
            <div className="col-xs-12 col-sm-8 col-md-8 offset-md-2">
              <h1>Todos</h1>
              <p className={this.state.isConnected ? "text-success" : "text-danger"}>
                {this.state.isConnected ? "WebSocket connected" : "WebSocket disconnected"}
              </p>
              {this.state.error && (
                <div className="alert alert-danger" role="alert">
                  {this.state.error}
                </div>
              )}
              <div className="todo-app">
                <AddTodo
                  disabled={!this.state.isConnected}
                  handleAddTodo={this.handleAddTodo}
                />
                <TodoList todos={this.state.todos} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
