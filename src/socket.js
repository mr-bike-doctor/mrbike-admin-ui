import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

// Socket.IO is mounted on the same server as the REST API, but on the host
// root rather than under the "/bikedoctor" API prefix.
const SOCKET_URL = API_BASE_URL.replace(/\/bikedoctor\/?$/, "");

let socket = null;
let socketToken = "";

export const getSocket = () => {
  const token = localStorage.getItem("adminToken") || "";
  if (!socket || socketToken !== token) {
    if (socket) socket.disconnect();
    socketToken = token;
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
};
