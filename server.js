const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

let users = {};        // username -> socket.id
let sockets = {};      // socket.id -> username

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("register", (username) => {
    if (!username) return;
    users[username] = socket.id;
    sockets[socket.id] = username;

    // notify everyone of updated online users
    io.emit("onlineUsers", Object.keys(users));
    console.log("Registered:", username);
  });

  socket.on("chatMessage", (data) => {
    // broadcast to everyone (including sender) — front-end will avoid duplicate display
    io.emit("chatMessage", data);
  });

  socket.on("privateMessage", (data) => {
    // data = { to, from, message }
    const target = users[data.to];
    if (target) {
      io.to(target).emit("privateMessage", { from: data.from, message: data.message });
      // optionally notify sender of success
      socket.emit("privateSent", { to: data.to, message: data.message });
    } else {
      socket.emit("userOffline", data.to);
    }
  });

  socket.on("oneTimeMessage", (data) => {
    // data = { to, from, message }
    const target = users[data.to];
    if (target) {
      io.to(target).emit("oneTimeMessage", { from: data.from, message: data.message });
      socket.emit("oneTimeSent", { to: data.to });
    } else {
      socket.emit("userOffline", data.to);
    }
  });

  socket.on("typing", (payload) => {
    // payload = { from, isTyping } broadcast to others
    socket.broadcast.emit("typing", payload);
  });

  socket.on("disconnect", () => {
    const username = sockets[socket.id];
    if (username) {
      delete users[username];
      delete sockets[socket.id];
      io.emit("onlineUsers", Object.keys(users));
      console.log("Disconnected:", username);
    } else {
      console.log("Socket disconnected:", socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on Port: ${PORT}`);
});
