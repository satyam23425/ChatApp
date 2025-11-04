const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

let users = {};   // username → socket.id
let sockets = {}; // socket.id → username

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // User register
  socket.on("register", (username) => {
    users[username] = socket.id;
    sockets[socket.id] = username;
    io.emit("onlineUsers", Object.keys(users));
  });

  // Public chat
  socket.on("chatMessage", (data) => {
    io.emit("chatMessage", data);
  });

  // Private DM
  socket.on("privateMessage", (data) => {
    const target = users[data.to];
    if (target) {
      io.to(target).emit("privateMessage", { from: data.from, message: data.message });
    }
  });

  // Typing indicator
  socket.on("typing", (payload) => {
    socket.broadcast.emit("typing", payload);
  });

  //  Disconnect
  socket.on("disconnect", () => {
    const username = sockets[socket.id];
    if (username) {
      delete users[username];
      delete sockets[socket.id];
      io.emit("onlineUsers", Object.keys(users));
    }
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server running on", PORT));
