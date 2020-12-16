// -= File Info =-
// ...

// -= Import decelerations =-

// Chat server libraries
const express = require("express");
const chatServer = express();
const http = require("http").createServer(chatServer);
const io = require("socket.io")(http);
const path = require("path");
const axios = require('axios');
const querystring = require('querystring');

// Local libraries
const validateInputs = require("../lib/validate-inputs");
const database = require("../lib/database");
const debugUtils = require("../lib/debug-utils");
const queue = require("../lib/queue");

// -= Constant decelerations =-

const CONFIG = require("./config");
const WEBSERVERURL = "localhost:8000";
const URL = "localhost";
const PORT = 8080;
const DB = new database.Database();

// -= Variable decelerations =-

let users = {};
let channels = [];
let messageCount = 0;
let socketQueue = new queue.Queue();

// -= Function decelerations =-

// ... initialiseDatabase
// This function will attempt to create a new database with tables
// It won't overwrite the database if it already is in the specified directory
// It also connects the 'DB' object with the database file
async function initialiseDatabase(path) {
    try {
        await DB.initialise(path);
        await DB.db.exec("PRAGMA foreign_keys = ON;");
        await DB.newTable(
            "users",
            `(user_id INTEGER PRIMARY KEY,
            user_name TEXT NOT NULL,
            user_status INTEGER NOT NULL,
            user_onlinetime INTEGER NOT NULL,
            user_lastchannelid INTEGER NOT NULL
            );`
        );
        await DB.newTable(
            "messages",
            `(message_id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            message_type INTEGER NOT NULL,
            message_content TEXT NOT NULL,
            channel_id INTEGER NOT NULL,
            time INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
            FOREIGN KEY (channel_id) REFERENCES channels (channel_id) ON DELETE CASCADE
            );`
        );
        await DB.newTable(
            "tags",
            `(tag_id INTEGER PRIMARY KEY,
            target_type INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            tag_type INTEGER NOT NULL,
            tag_content TEXT,
            user_id INTEGER NOT NULL,
            time INTEGER NOT NULL
            );`
        );
        await DB.newTable(
            "channels",
            `(channel_id INTEGER PRIMARY KEY,
            channel_name TEXT NOT NULL,
            channel_description TEXT,
            channel_type INTEGER NOT NULL
            );`
        );
        
        await DB.newRow(
            "channels",
            "(channel_name, channel_description, channel_type)",
            "('general', 'General Channel', '0')"
        )
    }
    
    catch (error) {
        debugUtils.colorConsole(
            `Database`,
            `Error occurred: ${error.message.substr(14)}`
        );
    }
}

function getUsers() {
    return new Promise((resolve, reject) => {
        DB.db.all(
            `SELECT * FROM users`,
            (err, row) => resolve(row)
        );
    });
}

function getChannels() {
    return new Promise((resolve, reject) => {
        DB.db.all(
            `SELECT * FROM channels`,
            (err, row) => resolve(row)
        );
    });
}

function getMessageCount() {
    return new Promise((resolve, reject) => {
        DB.db.all(
            `SELECT * FROM messages ORDER BY message_id DESC LIMIT 1`,
            (err, row) => resolve(row)
        );
    });
}

function getMessagesRange(channelID, range, offset) {
    return new Promise((resolve, reject) => {
        DB.db.all(
            `SELECT * FROM messages WHERE channel_id = '${channelID}' ORDER BY time DESC LIMIT ${range} OFFSET ${offset}`,
            (err, row) => resolve(row.reverse())
        );
    });
}

async function updateTempUsers() {
    let tmp = await getUsers();

    if (tmp.length !== 0) {
        users = tmp;
    }
}

async function updateTempChannels() {
    channels = await getChannels();
}

async function updateMessageCount() {
    let lastMessage = await getMessageCount();

    if (lastMessage !== undefined) messageCount = [0].message_id;
    else messageCount = 0;
}

async function updateMessageRange(channelID, offset) {
    return getMessagesRange(channelID, 20, offset);
}

async function addMessage(socket, data) {
    data.message_content = validateInputs.cleanText(data.message_content);

    DB.newRow("messages", "(user_id, message_type, message_content, channel_id, time)", `('${socket.userID}', '0', '${data.message_content}', '${socket.currentChannelID}', '${data.time}')`);
    messageCount += 1;

    output = {
        "message_id": messageCount,
        "user_id": socket.userID,
        "message_type": 0,
        "message_content": data.message_content,
        "channel_id": socket.currentChannelID,
        "time": data.time
    };

    return output;
}

async function userIDIndex(input) {
    let index = -1;

    for (let i = 0; i < users.length; i++) {
        if (users[i].user_id == input) {
            index = i;
        }
    }

    return index;
}

async function channelNameIndex(input) {
    let index = -1;

    for (let i = 0; i < channels.length; i++) {
        if (channels[i].channel_name == input) {
            index = i;
        }
    }

    return index;
}

async function channelIDIndex(input) {
    let index = -1;

    for (let i = 0; i < channels.length; i++) {
        if (channels[i].channel_id == input) {
            index = i;
        }
    }

    return index;
}

// -= Main/Start =-

let dir = path.join(__dirname, 'data/img');

chatServer.use(express.static(dir));

initialiseDatabase("chat-server/data/data.db");

axios.get(`http://${WEBSERVERURL}/checkserver:${URL}>${PORT}`).then(function (response) {
    if (!response.data) {
        axios.post(`http://${WEBSERVERURL}/addchatserver`, querystring.stringify({
            url: `${URL}:${PORT}`,
            name: CONFIG.name,
            public: CONFIG.public,
            password: CONFIG.password,
            securityCode: CONFIG.securityCode,
            icon: CONFIG.icon
        })).then(function (response) {
            if (response.data == "Success") {
                // Registered with web server, start socket
                startChatServer();
            }
        });
    } else {
        // Already registered with web server, start socket
        startChatServer();
    }
});

// TODO: Only start socket connection once the server has been setup/registered with the web server

function startChatServer() {
    // -= Socket setup =-

    io.on("connection", (socket) => {
        debugUtils.colorConsole("Client", "Connected");

        updateMessageCount();

        socket.currentChannelName = null;
        socket.currentChannelID = 1;

        // socket.emit("connect channel", null);

        socket.on("user connect", (data) => {
            updateTempUsers().then(function() {
                userIDIndex(data[1]).then(function(result) {
                    socket.userName = data[0];
                    socket.userID = data[1];

                    if (result == -1) {
                        // TODO: check with web server if user is registered for this server
                        
                        axios.post(`http://${WEBSERVERURL}/servergetuserlist`, querystring.stringify({
                            url: `${URL}:${PORT}`,
                            securityCode: CONFIG.securityCode
                        })).then(function (response) {
                            let userRegistered = false;

                            for (entry in response.data) {
                                if (response.data[entry].user_id == data[1]) {
                                    userRegistered = true;
                                    break;
                                }
                            }

                            if (userRegistered) {
                                // Add to database
                                DB.newRow("users", "(user_id, user_name, user_status, user_onlinetime, user_lastchannelid)", `('${data[1]}', '${data[0]}', '1' ,'${Date.now()}', '1')`).then(function() {
                                    debugUtils.colorConsole("Chat Server", `New user registered: ${data[0]} (${data[1]})`);
                                });
                            }
                        });

                    }
                    
                    else {
                        // Already in database
                        DB.updateRow("users", "user_id", socket.userID, "user_status", 1);
                        debugUtils.colorConsole("Chat Server", `User: ${data[0]} (${data[1]}), couldn't be registered as they're already registered`);
                    }
                    
                    updateTempUsers().then(function() {
                        socket.emit("user list", users);
                        socket.broadcast.emit("user list", users);
                        updateTempChannels().then(function() {
                            userIDIndex(socket.userID).then(function(result) {
                                channelIDIndex(users[result].user_lastchannelid).then(function(result) {
                                    if (result != -1) {
                                        socket.emit("user connect", channels[result].channel_name);
                                    }
                                    
                                    else {
                                        socket.emit("user connect", channels[0].channel_name);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });

        // ... 'get users'
        socket.on("get users", (data) => {
            updateTempUsers().then(function () {
                socket.emit("user list", users);
            });
        });

        // ... 'get channels'
        socket.on("get channels", (data) => {
            updateTempChannels().then(function () {
                let user_channels = channels;

                for (var i = 0; i < user_channels.length; i++) {
                    if (user_channels[i].channel_type == 1 && !user_channels[i].channel_name.includes(socket.userID.toString())) {
                        delete user_channels[i];
                    }
                }

                socket.emit("channel list", user_channels);
            });
        });

        // ... 'connect channel'
        socket.on("connect channel", (data) => {
            data = validateInputs.cleanText(data);

            if (socket.currentChannelName !== data) {
                // Not already connected
                updateTempChannels().then(function() {
                    channelNameIndex(data).then(function(result) {
                        if (result != -1) {
                            // Channel exists
                            // TODO: If DM channel, check if user has permission to join
                            socket.emit("ask channel list", null);
                            socket.leave(socket.currentChannelName);
                            socket.currentChannelName = data;
                            socket.currentChannelID = channels[result].channel_id;
                            socket.join(data);
                            debugUtils.colorConsole("Client", `Joined channel: '${data}'`);
                            socket.emit("connect channel", data);
                        }
                    });
                });
            }
        });

        // ... 'create user channel'
        socket.on("create user channel", (data) => {
            let channelName;

            if (socket.userID < data.user_id) {
                channelName = "_" + socket.userID + "_" + data.user_id + "_" + socket.userName + "_" + data.user_name;
            } else if (socket.userID > data.user_id) {
                channelName = "_" + data.user_id + "_" + socket.userID + "_" + data.user_name + "_" + socket.userName;
            }

            if (channelName !== undefined) {
                updateTempChannels().then(function () {
                    channelNameIndex(channelName).then(function (result) {
                        if (result == -1) {
                            // Channel doesn't already exist
                            socket.join(channelName);
                            DB.newRow("channels", "(channel_name, channel_description, channel_type)", `('${channelName}', '', '1')`).then(function() {
                                debugUtils.colorConsole("Chat Server", `New user channel created: ${channelName}`);
                            });
                            updateTempChannels().then(function() {
                                socket.emit("ask channel list", null);
                                socket.broadcast.emit("channel list", null);
                            });
                        } else {
                            debugUtils.colorConsole("Chat Server", `Channel: ${channelName}, couldn't be created as it already exists`);
                        }
                    });
                });
            } else {
                debugUtils.colorConsole("Chat Server", `You can't create a user channel with yourself!`);
            }
        });

        // ... 'create channel'
        socket.on("create channel", (data) => {
            data[0] = validateInputs.cleanText(data[0]);
            data[1] = validateInputs.cleanText(data[1]);

            updateTempChannels().then(function() {
                channelNameIndex(data[0]).then(function(result) {
                    if (result == -1) {
                        // Channel doesn't already exist
                        socket.join(data[0]);
                        DB.newRow("channels", "(channel_name, channel_description, channel_type)", `('${data[0]}', '${data[1]}', '0')`).then(function() {
                            debugUtils.colorConsole("Chat Server", `New channel created: ${data[0]}`);
                        });
                        updateTempChannels().then(function() {
                            socket.emit("ask channel list", null);
                            socket.broadcast.emit("ask channel list", null);
                        });
                    } else {
                        debugUtils.colorConsole("Chat Server", `Channel: ${data[0]}, couldn't be created as it already exists`);
                    }
                });
            });
        });

        // ... 'edit channel'
        socket.on("edit channel", (data) => {
            // TODO: 
            data[0] = validateInputs.cleanText(data[0]);
            data[1] = validateInputs.cleanText(data[1]);
            data[2] = validateInputs.cleanText(data[2]);

            if (data[0] !== "general" && data[1] !== "general") {
                updateTempChannels().then(function () {
                    channelNameIndex(data[1]).then(function (result) {
                        if (result == -1) {
                            // Channel name isn't already taken, so the channel can be updated 
                            DB.updateRow("channels", "channel_name", data[0], "channel_description", data[2]);
                            DB.updateRow("channels", "channel_name", data[0], "channel_name", data[1]);
                            debugUtils.colorConsole("Chat Server", `Channel: ${data[1]} (previously known as ${data[0]}), has been updated`);

                            updateTempChannels().then(function () {
                                socket.emit("ask channel list", null);
                                socket.broadcast.emit("channel list", channels);
                                socket.emit("connect channel", "general");
                                socket.broadcast.emit("connect channel", "general");
                            });
                        } else if (data[0] == data[1]) {
                            // Channel name not updated, update the description
                            DB.updateRow("channels", "channel_name", data[0], "channel_description", data[2]);
                            debugUtils.colorConsole("Chat Server", `Channel: ${data[0]} has been updated`);

                            updateTempChannels().then(function () {
                                socket.emit("ask channel list", null);
                                socket.broadcast.emit("channel list", channels);
                            });
                        }
                    });
                });
            }
            
            else {
                debugUtils.colorConsole("Chat Server", `Channel: ${data}, couldn't be deleted as its protected`);
            }
        });

        // ... 'delete channel'
        socket.on("delete channel", (data) => {
            data = validateInputs.cleanText(data);

            if (data !== "general") {
                updateTempChannels().then(function() {
                    channelNameIndex(data).then(function(result) {
                        if (result !== -1) {
                            // Exists
                            DB.removeRowID("channels", channels[result].channel_id);
                            debugUtils.colorConsole("Chat Server", `Channel: ${data}, has been deleted`);
                            updateTempChannels().then(function() {
                                socket.emit("ask channel list", null);
                                socket.broadcast.emit("channel list", channels);
                                socket.emit("delete channel", "general");
                                socket.broadcast.emit("delete channel", "general");
                            });
                        }
                        
                        else {
                            debugUtils.colorConsole("Chat Server", `Channel: ${data}, couldn't be deleted as it doesn't exist`);
                        }
                    });
                });
            }
            
            else {
                debugUtils.colorConsole("Chat Server", `Channel: ${data}, couldn't be deleted as its protected`);
            }
        });

        // ... 'get messages'
        // data: 'message index offset'
        socket.on("get messages", (data) => {
            socketQueue.add(["get messages", socket, data]);
        });

        // ... 'send message'
        // data: 'msg content'
        socket.on("send message", (data) => {
            socketQueue.add(["send message", socket, data]);
        });

        // ... 'edit message'
        socket.on("edit message", (data) => {
            // TODO: edit message cleaning

            socketQueue.add(["edit message", socket, data]);
        });

        // ... 'delete message'
        socket.on("delete message", (data) => {
            socketQueue.add(["delete message", socket, data]);
        });

        // ... 'report user'
        socket.on("report user", (data) => {

        });

        socket.on("disconnect", (reason) => {
            // Update database for user with online time and last channel
            DB.updateRow("users", "user_id", socket.userID, "user_status", 0);
            DB.updateRow("users", "user_id", socket.userID, "user_onlinetime", Date.now());
            DB.updateRow("users", "user_id", socket.userID, "user_lastchannelid", socket.currentChannelID);
            debugUtils.colorConsole("Client", "Disconnected");

            socket.broadcast.emit("user list", users);
        });
    });

    http.listen(PORT, URL, function() {
        debugUtils.colorConsole("Chat Server", `Listening on port: ${PORT}`);
    });
    
    // TODO: Receive request from web server to delete users from database
    
    // TODO: Queue system for requests
    
    // Primary queue (sockets)
    setInterval(function() {
        while (!socketQueue.isEmpty()) {
            // Execute next item
            let item = socketQueue.remove();
    
            if (item[0] === "get messages") {
                updateMessageRange(item[1].currentChannelID, item[2]).then(function(result) {
                    item[1].emit("get messages", result);
                });
    
            } else if (item[0] === "send message") {
                // TODO: Check if user has permission for that channel
                DB.updateRow("users", "user_id", item[1].userID, "user_onlinetime", Date.now());
    
                addMessage(item[1], item[2]).then(function(result) {
                    item[1].emit("send message", result);
                    item[1].broadcast.to(item[1].currentChannelName).emit("send message", result);
    
                    debugUtils.colorConsole("Client", `User: '${item[1].userName}' (${item[1].userID}), Channel: '${item[1].currentChannelName}', Message: '${result.message_content}'`);
                });
    
            } else if (item[0] === "edit message") {
                // TODO:
                
            } else if (item[0] === "delete message") {
                DB.removeRowID("messages", item[2]);
    
                item[1].emit("delete message", item[2]);
                item[1].broadcast.emit("delete message", item[2]);
                
            } else if (item[0] === "report user") {
                // TODO:
    
            }
        }
    }, 50);
    
    // Secondary queue (for updating the database)
    // TODO:
    setInterval(function() {
    
    }, 10000);
}