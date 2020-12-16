// -= File Info =-
// Hosts both the web client page and web server REST API

// -= Import decelerations =-

// Web server libraries
const express = require("express");
const webServer = express();
const bodyParser = require('body-parser');
const expressSession = require("express-session");
const helmet = require("helmet");
const http = require("http").createServer(webServer);
const io = require("socket.io")(http); // Provides the socket-io-client js to the client
const path = require("path");
const fs = require('fs');
const nodemailer = require("nodemailer");

// Login libraries
const passport = require("passport");
const strategy = require("passport-local").Strategy;
const ensureLogin = require("connect-ensure-login");

// Local libraries
const validateInputs = require("../lib/validate-inputs");
const database = require("../lib/database");
const debugUtils = require("../lib/debug-utils");

// -= Constant decelerations =-

const EMAILADDRESS = ""; // IMPORTANT: put in a gmail account address here
const EMAILPASSWORD = ""; // IMPORTANT: put in a gmail account password here
const PORT = 8000;
const DB = new database.Database();
const EMAIL_TRANSPORTER = nodemailer.createTransport({
    service: 'gmail',
    auth: {
           user: EMAILADDRESS,
           pass: EMAILPASSWORD
    }
});

// -= Variable decelerations =-

// ... emailCodes
// Stores all the currently used email verification codes that are used during
// the servers runtime to prevent potential conflicts
// Usage: userEmail: [emailCode, actionType, expireTimeStamp]
// Example: "test@test.com": ["123456", "createUser", "1584100218755"]
let emailCodes = {};

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
            user_email TEXT NOT NULL,
            user_name TEXT NOT NULL,
            user_password TEXT NOT NULL,
            user_haspicture INTEGER NOT NULL
            );`
        );
        await DB.newTable(
            "servers",
            `(server_id INTEGER PRIMARY KEY,
            server_url TEXT NOT NULL,
            server_name TEXT NOT NULL,
            server_invite TEXT NOT NULL,
            server_public INTEGER NOT NULL,
            server_password TEXT,
            server_securitycode TEXT NOT NULL,
            server_haspicture INTEGER NOT NULL
            );`
        );
        await DB.newTable(
            "users_servers",
            `(entry_id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            server_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
            FOREIGN KEY (server_id) REFERENCES servers (server_id) ON DELETE CASCADE
            );`
        );

        // Included for making development easier
        await DB.newRow(
            "users",
            "(user_email, user_name, user_password, user_haspicture)",
            "('test1@test.com', 'testuser1', 'password123*', '0')"
        );
        await DB.newRow(
            "users",
            "(user_email, user_name, user_password, user_haspicture)",
            "('test2@test.com', 'testuser2', 'password123*', '0')"
        );
        await DB.newRow(
            "users",
            "(user_email, user_name, user_password, user_haspicture)",
            "('test3@test.com', 'testuser3', 'password123*', '0')"
        );
    }
    
    catch (error) {
        debugUtils.colorConsole(
            `Database`,
            `Error occurred: ${error.message.substr(14)}`
        );
    }
}

// ... checkDatabaseEmail
// ...
async function checkDatabaseEmail(email) {
    let emailExists = await DB.searchColumnValue("users", "user_email", email);

    if (emailExists.length !== 0) return true;
    return false;
}

// ... checkDatabaseUsername
// ...
async function checkDatabaseUsername(username) {
    let usernameExists = await DB.searchColumnValue("users", "user_name", username);
    
    if (usernameExists.length !== 0) return true;
    return false;
}

// ... checkDatabaseServerUrl
// ...
async function checkDatabaseServerUrl(serverUrl) {
    let serverExists = await DB.searchColumnValue("servers", "server_url", serverUrl);
    
    if (serverExists.length !== 0) return true;
    return false;
}

// ... getUserServers
// ...
async function getUserServers(userID) {
    let userServers = await DB.searchColumnValue("users_servers", "user_id", userID);
    
    return userServers;
}

async function getServerUrl(serverID) {
    let serverUrl = await DB.searchColumnValue("servers", "server_id", serverID);

    return serverUrl;
}

async function getServers(userServersList) {
    let serverUrls = [];

    for (server in userServersList) {
        serverUrls.push((await getServerUrl(userServersList[server].server_id))[0]);
    }

    return serverUrls;
}

async function getServerUsers(serverUrl, serverSecurityCode) {
    let server = await DB.searchColumnValue("servers", "server_url", serverUrl);

    if (server.length == 1 && server[0].server_securitycode == serverSecurityCode) {
        let serverUsers = await DB.searchColumnValue("users_servers", "server_id", server[0].server_id);
    
        return serverUsers;
    }
}

async function getPublicServers() {
    let publicServers = await DB.searchColumnValue("servers", "server_public", 1);

    return publicServers;
}

// ... createUser
// Validate all user inputs and if it passes, then create a new entry to the 'users'
// table in database
async function createUser(email, username, password, passwordConfirmation, emailCode) {
    // Check if email is valid
    let [emailOutput, emailPass] = validateInputs.checkEmail(email);
    if (!emailPass) return "Email: " + emailOutput;

    // Check if email is not already in use
    let emailExists = await DB.searchColumnValue("users", "user_email", email);
    if (emailExists.length !== 0) return "Email already in use";

    // Check if email code is valid
    let [emailCodeOutput, emailCodePass] = validateInputs.checkEmailCode(emailCode);
    if (!emailCodePass) return "Email code: " + emailCodeOutput;

    // Check if email code matches the email
    if (emailCodes[email] === undefined) return "Email hasn't been sent a code";
    if (emailCodes[email][0] !== emailCode && emailCodes[email][1] !== "createUser" && emailCodes[email][2] <= Date.now()) return "Email code expired or invalid";

    // Check if password matches the password confirmation
    if (password !== passwordConfirmation) return "Passwords: Don't match";

    // Check if password is strong enough
    let [passwordOutput, passwordPass] = validateInputs.checkPassword(password);
    if (!passwordPass) return "Password: " + passwordOutput;

    // Check if username is valid
    let [usernameOutput, usernamePass] = validateInputs.checkUsername(username);
    if (!usernamePass) return "Username: " + usernameOutput;

    // Check if username is not already in use
    let usernameExists = await DB.searchColumnValue("users", "user_name", username);
    if (usernameExists.length !== 0) return "Username already in use";

    // Passed all checks, add record to database
    await DB.newRow("users", "(user_email, user_name, user_password, user_haspicture)", `('${email}', '${username}', '${password}', '0')`);

    // Remove email code
    delete emailCodes[email];

    return "Success";
}

// ... updateUser
// Validate all user inputs and if it passes, then update the user in the 'users'
// table in database. Also send the new updated info to linked chat servers in the
// 'users_servers' table in the database
async function updateUser(userID, email, username, oldPassword, password, passwordConfirmation, emailCode) {
    // Check if userID is valid
    let userExists = await DB.searchColumnValue("users", "user_id", userID);
    if (userExists.length === 0) return "User doesn't exist";

    // Check if email is valid
    let [emailOutput, emailPass] = validateInputs.checkEmail(email);
    if (!emailPass) return "Email: " + emailOutput;

    // Check if email is not already in use
    let emailExists = await DB.searchColumnValue("users", "user_email", email);
    if (emailExists.length !== 0 && emailExists[0].user_id !== userID) return "Email already in use";

    // Check if email code is valid
    let [emailCodeOutput, emailCodePass] = validateInputs.checkEmailCode(emailCode);
    if (!emailCodePass) return "Email code: " + emailCodeOutput;

    // Check if email code matches the email
    if (emailCodes[email] === undefined) return "Email hasn't been sent a code";
    if (emailCodes[email][0] !== emailCode && emailCodes[email][1] !== "updateUser" && emailCodes[email][2] <= Date.now()) return "Email code expired or invalid";

    // Check if password matches the password confirmation
    if (password !== passwordConfirmation) return "Passwords: Don't match";

    // Check if password is strong enough
    let [passwordOutput, passwordPass] = validateInputs.checkPassword(password);
    if (!passwordPass) return "Password: " + passwordOutput;

    // Check if username is valid
    let [usernameOutput, usernamePass] = validateInputs.checkUsername(username);
    if (!usernamePass) return "Username: " + usernameOutput;

    // Check if username is not already in use
    let usernameExists = await DB.searchColumnValue("users", "user_name", username);
    if (usernameExists.length !== 0 && usernameExists[0].user_id !== userID) return "Username already in use";

    // Passed all checks, update record in database
    await DB.updateRow("users", "user_id", userID, "user_email", email);
    await DB.updateRow("users", "user_id", userID, "user_name", username);
    await DB.updateRow("users", "user_id", userID, "user_password", password);

    // Remove email code
    delete emailCodes[email];

    return "Success";
}

// ... deleteUser
// Validate all user inputs and if it passes, then remove the user in the 'users'
// table in database. Also remove the user from linked chat servers in the
// 'users_servers' table in the database and remove all entries for that user in
// the table
async function deleteUser(userID, password, emailCode) {
    // Check if userID is valid
    let userExists = await DB.searchColumnValue("users", "user_id", userID);
    if (userExists.length === 0) return "User doesn't exist";

    // Check password with database
    let [passwordOutput, passwordPass] = validateInputs.checkPassword(password);
    if (!passwordPass || userExists[0].user_password !== password) return "Password is wrong";

    // Check email code, that it matches the email and task
    let email = userExists[0].user_email;
    if (emailCodes[email] === undefined) return "Email hasn't been sent a code";
    if (emailCodes[email][0] !== emailCode && emailCodes[email][1] !== "deleteUser" && emailCodes[email][2] <= Date.now()) return "Email code expired or invalid";

    // Passes all checks, remove from all tables in the database
    await DB.removeRowID("users", userID);

    // Remove email code
    delete emailCodes[email];

    // TODO: Send removal to linked servers

    return "Success";
}

// ... addChatServer
// Validate all the inputs from the chat server, create a new entry to the
// 'servers' table in the database if all inputs pass
async function addChatServer(url, name, public, password, securityCode, icon) {
    // Check if server with the same url doesn't already exist
    let serverExists = await DB.searchColumnValue("servers", "server_url", url);
    if (serverExists.length !== 0) return "Chat server with same URL already registered";

    // Check if public is valid
    if ((public !== "0" && public !== "1") || public === undefined) return "Public needs to be either 0 or 1";

    // Check if password is valid
    if (password === "") {
        if (public === "0") return "Password needs to be set for a private server";
    } else {
        if (public === "0") {
            let [passwordOutput, passwordPass] = validateInputs.checkPassword(password);
            if (!passwordPass) return "Password: " + passwordOutput;
        } else {
            password = "";
        }
    }

    // Check if security code is valid
    let [securityCodeOutput, securityCodePass] = validateInputs.checkPassword(securityCode);
    if (!securityCodePass) return "Security code: " + securityCodeOutput;

    // Check if name is present
    if ((name == "")) return "Name needs to be set"

    // Check if icon is present
    if ((icon !== "0" && icon !== "1") || icon === undefined)  return "Icon needs to be either 0 or 1"

    // Passes all checks, add record to database
    await createInviteCode().then(async function(inviteCode) {
        await DB.newRow("servers", "(server_url, server_name, server_invite, server_public, server_password, server_securitycode, server_haspicture)", `('${url}', '${name}', '${inviteCode}', '${public}', '${password}', '${securityCode}', '${icon}')`)
    });

    return "Success";
}

// ... deleteChatServer
// Validate all the inputs from the chat server, remove a record in the
// 'servers' table in the database if all inputs pass
async function deleteChatServer(url, securityCode) {
    // Check if server with the same url already exists
    let serverExists = await DB.searchColumnValue("servers", "server_url", url);
    if (serverExists.length === 0) return "No chat servers with the same URL already registered";

    // Check if security code is valid
    let [securityCodeOutput, securityCodePass] = validateInputs.checkPassword(securityCode);
    if (!securityCodePass) return "Security code: " + securityCodeOutput;

    // Check if security code is the same as the one stored in the database
    if (serverExists[0].server_securitycode !== securityCode) return "Incorrect security code";

    // Passes all checks, remove record from database
    await DB.removeRowID("servers", serverExists[0].server_id);

    return "Success";
}

// ... joinChatServer
// Create a new entry to the 'users_servers' table in the database
async function joinChatServer(userID, inviteCode, password) {
    // Check if userID is valid
    let userExists = await DB.searchColumnValue("users", "user_id", userID);
    if (userExists.length === 0) return "User doesn't exist";

    // Check if invite code is valid
    let [inviteCodeOutput, inviteCodePass] = validateInputs.checkInviteCode(inviteCode);
    if (!inviteCodePass) return "Invite code: " + inviteCodeOutput;

    // Check if invite code is in the database
    let serverExists = await DB.searchColumnValue("servers", "server_invite", inviteCode);
    if (serverExists.length === 0) return "Server doesn't exist";

    // Check if user is not already a member of the server
    let userServersList = await DB.searchColumnValue("users_servers", "user_id", userID);
    let userMemberOfServer = false;
    let index = -1;
    for (let i = 0; i < userServersList.length; i++) {
        if (userServersList[i].server_id === serverExists[0].server_id) {
            userMemberOfServer = true;
            index = i;
        }
    }
    if (userMemberOfServer) return "User a member of this server already";

    // Check if the server has a password
    if (serverExists[0].server_public === 0) {
        // Check if password is valid
        let [passwordOutput, passwordPass] = validateInputs.checkPassword(password);
        if (!passwordPass) return "Password: " + passwordOutput;

        // Check if password matches with the server
        if (serverExists[0].server_password !== password) return "Incorrect password";
    }

    // Passes all checks, add record to database
    await DB.newRow("users_servers", "(user_id, server_id)", `('${userExists[0].user_id}', '${serverExists[0].server_id}')`);

    return serverExists[0];
}

// ... leaveChatServer
// Remove the user's entry for that server in the 'users_servers' table in the database
async function leaveChatServer(userID, serverID) {
    // Check if userID is valid
    let userExists = await DB.searchColumnValue("users", "user_id", userID);
    if (userExists.length === 0) return "User doesn't exist";

    // Check if serverID is valid
    let serverExists = await DB.searchColumnValue("servers", "server_id", serverID);
    if (serverExists.length === 0) return "Server doesn't exist";

    // Check if user is already a member of the server
    let userServersList = await DB.searchColumnValue("users_servers", "user_id", userID);
    let userMemberOfServer = false;
    let index = -1;
    for (let i = 0; i < userServersList.length; i++) {
        if (userServersList[i].server_id == serverID) {
            userMemberOfServer = true;
            index = i;
        }
    }
    if (!userMemberOfServer) return "User not a member of this server";

    // Passes all checks, add record to database
    await DB.removeRowID("users_servers", userServersList[index].entry_id);

    // TODO: Send removal to linked servers
    return "Success";
}

// ... createInviteCode
// Users are able to join chat servers via either the server browser (which only
// shows chat server set to public) or an invite code, which is generated here
async function createInviteCode() {
    // Generate code
    let inviteCode = Math.floor(Math.random()*2821109907455).toString(36);

    // Check if already in use (super low chance but still important)
    let inviteCodeExists = await DB.searchColumnValue("servers", "server_invite", inviteCode);

    if (inviteCodeExists.length === 0) {
        // Not already in use
        return inviteCode;
    }
    
    else {
        // Recall this function (very very unlikely to happen multiple times,
        // let alone even once)
        return createInviteCode();
    }
}

// ... createEmailCode
// Users accounts are accessed with an email address, so that they can be verified
// for various actions such as creating an account, updating account details and
// deleting an account. These actions are confirmed by the user by sending an email
// to the users address with a unique temporary code, which is generated here. An
// expire timestamp is also generated with a 1 hour offset from the time its generated
async function createEmailCode(email, actionType) {
    // Generate code
    let emailCode = debugUtils.padString(Math.floor(Math.random() * 1000000), 6, "0");

    // Check if already in use (very very low chance but still important)
    let emailCodeExists = false;

    for (let i in emailCodes) {
        if (i[0] === emailCode) {
            // Email code already in use
            emailCodeExists = true;
        }
    }

    if (!emailCodeExists) {
        // Not already in use, add to 'emailCodes' with expireTimeStamp
        // 100 milliseconds = 1 second
        // 60 seconds = 1 minute
        // 60 minutes = 1 hour
        // Total equals 1 hour in milliseconds: 360000
        let expireTimeStamp = new Date(Date.now() + 360000);
        emailCodes[email] = [emailCode, actionType, expireTimeStamp];

        return emailCode;
    }
    
    else {
        // Recall this function to regenerate the code (very unlikely to happen multiple times)
        return createEmailCode(email, actionType);
    }
}

// ... sendVerifyEmail
// Send a user's email address a verification email with a code generated with
// `CreateEmailCode`, and a title specifying the action the code is valid for
async function sendVerifyEmail(email, actionType) {
    // Check email
    let [emailOutput, emailPass] = validateInputs.checkEmail(email);
    if (!emailPass) return "Email: " + emailOutput;

    try {
        // Check if email already has an email code sent for the same action
        if (emailCodes[email][1] === actionType) return "Email already has code sent.";
    }
    
    catch {
        // Couldn't find email in email codes
    }

    // Generate code with 'CreateEmailCode'
    await createEmailCode(email, actionType).then(function(emailCode) {
        // Send email with code and action type to address
        let mailOptions = {
            from: EMAILADDRESS,
            to: email,
            subject: `${actionType}`,
            html: `<p>${emailCode}</p>` // TODO: Add email visuals and info
        };
    
        EMAIL_TRANSPORTER.sendMail(mailOptions, function (err, info) {
            if (err) console.log(err)
            // else console.log(info);
        });
    });

    return "Success";
}

// -= Passport setup =-

// ... passport.use
// ... passport.serializeUser
// ... passport.deserializeUser

// -= Web server setup =-

// ... webServer.set ...
// ... webServer.get ...
// ... webServer.post ...

// -= Main/Start =-

// ... initialiseDatabase("/db/data.db");
// ... http.listen(PORT);

// -= Temporary testing stuff =-

passport.use(
    new strategy(function(username, password, done) {
        DB.db.all(`SELECT * FROM users WHERE user_name = '${username}'`, function(err, user) {
                if (err) {
                    return done(err);
                }
            
                if (!user[0]) {
                    return done(null, false, {message: "Incorrect username."});
                }
            
                if (user[0].user_password !== password) {
                    return done(null, false, {message: "Incorrect password."});
                }
                
                // Passed all checks, log in user
                return done(null, user[0]);
            }
        );
    })
);

passport.serializeUser(function(user, done) {
    done(null, user.user_id);
});

passport.deserializeUser(function(id, done) {
    DB.db.all(`SELECT * FROM users WHERE user_id = '${id}'`, function(err, user) {
        if (err) {
            return done(err);
        }
        done(null, user);
    });
});

webServer.set("view engine", "ejs");
webServer.use(helmet());
webServer.use(bodyParser.urlencoded({ extended: true }));
webServer.use(expressSession({secret: "amazing wow noodle", resave: false, saveUninitialized: false}));

// webServer.use(express.static("public"));
// console.log(path.join(__dirname, 'public'));
webServer.use('/', express.static(path.join(__dirname, 'public')));
webServer.use(passport.initialize());
webServer.use(passport.session());

webServer.post("/createuser", ensureLogin.ensureLoggedOut("/app"), function(req, res) {
    createUser(req.body.email, req.body.username, req.body.password, req.body.passwordConfirmation, req.body.emailCode).then(function(result) {
        if (result !== "Success") {
            res.json(result);
        }
        
        else {
            res.redirect("/login");
        }
    });
});

webServer.get("/sendcreateuseremailcode:email", ensureLogin.ensureLoggedOut("/app"), function (req, res) {
    sendVerifyEmail(req.params.email.substr(1), "createUser").then(function(result) {
        res.json(result);
    });
});

webServer.post("/updateuser", ensureLogin.ensureLoggedIn("/login"), function(req, res) {
    updateUser(req.user[0].user_id, req.body.email, req.body.username, req.body.oldPassword, req.body.password, req.body.passwordConfirmation, req.body.emailCode).then(function(result) {
        if (result !== "Success") {
            res.json(result);
        }
        
        else {
            res.redirect("/login");
        }
    });
});

webServer.get("/sendupdateuseremailcode:email", ensureLogin.ensureLoggedIn("/login"), function (req, res) {
    sendVerifyEmail(req.params.email.substr(1), "updateUser").then(function(result) {
        res.json(result);
    });
});

webServer.post("/deleteuser", ensureLogin.ensureLoggedIn("/login"), function(req, res) {
    deleteUser(req.user[0].user_id, req.body.password, req.body.emailCode).then(function(result) {
        if (result !== "Success") {
            res.json(result);
        }
        
        else {
            res.redirect("/login");
        }
    });
});

webServer.get("/senddeleteuseremailcode:email", ensureLogin.ensureLoggedIn("/login"), function (req, res) {
    sendVerifyEmail(req.params.email.substr(1), "deleteUser").then(function(result) {
        res.json(result);
    });
});

webServer.post("/addchatserver", function(req, res) {
    addChatServer(req.body.url, req.body.name, req.body.public, req.body.password, req.body.securityCode, req.body.icon).then(function(result) {
        res.json(result);
    });
});

webServer.post("/deletechatserver", function(req, res) {
    deleteChatServer(req.body.url, req.body.securityCode).then(function(result) {
        res.json(result);
    });
});

webServer.post("/userjoinchatserver", ensureLogin.ensureLoggedIn("/login"), function(req, res) {
    joinChatServer(req.user[0].user_id, req.body.inviteCode, req.body.password).then(function(result) {
        res.json(result);
    });
});

webServer.post("/userleavechatserver", ensureLogin.ensureLoggedIn("/login"), function(req, res) {
    leaveChatServer(req.user[0].user_id, req.body.serverID).then(function(result) {
        res.json(result);
    });
});

webServer.post("/login", ensureLogin.ensureLoggedOut("/app"), passport.authenticate("local", { failureRedirect: "/login" }), function(req, res) {
    debugUtils.colorConsole("Login", `User: '${req.body.username}' has logged in`);
    res.redirect("/app");
});

webServer.get("/logout", ensureLogin.ensureLoggedIn("/login"), function(req, res) {
    debugUtils.colorConsole("Login", `User: '${req.user[0].user_name}' has logged out`);
    req.logout();
    res.redirect("/login");
});

webServer.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "public", "home-page", "index.html"));
});

webServer.get("/login", ensureLogin.ensureLoggedOut("/app"), function(req, res) {
    res.sendFile(path.join(__dirname, "public", "login-page", "index.html"));
});

webServer.get("/app", ensureLogin.ensureLoggedIn("/login"), function(req, res) {
    res.render(path.join(__dirname, "public", "app-page", "index.ejs"), req.user[0]);
});

webServer.get("/checkemail:email", function(req, res) {
    checkDatabaseEmail(req.params.email.substr(1)).then(function (result) {
        res.send(result);
    });
});

webServer.get("/checkusername:username", function(req, res) {
    checkDatabaseUsername(req.params.username.substr(1)).then(function (result) {
        res.send(result);
    });
});

webServer.get("/checkserver:serverurl", function (req, res) {
    let serverurl = req.params.serverurl.substr(1);
    serverurl = serverurl.replace(">", ":");

    checkDatabaseServerUrl(serverurl).then(function (result) {
        res.send(result);
    });
});

webServer.get("/usergetserverlist", ensureLogin.ensureLoggedIn("/login"), function (req, res) {
    getUserServers(req.user[0].user_id).then(function (result) {
        res.send(result);
    });
});

webServer.get("/usergetservers", ensureLogin.ensureLoggedIn("/login"), function (req, res) {
    getUserServers(req.user[0].user_id).then(function (result) {
        getServers(result).then(function(newresult) {
            res.send(newresult);
        });
    });
});

webServer.post("/servergetuserlist", function (req, res) {
    getServerUsers(req.body.url, req.body.securityCode).then(function (result) {
        res.send(result);
    });
});

webServer.get("/getpublicserverlist", ensureLogin.ensureLoggedIn("/login"), function (req, res) {
    getPublicServers().then(function (result) {
        res.send(result);
    });
});

initialiseDatabase("client/data/data.db");

http.listen(PORT, 'localhost', function() {
    debugUtils.colorConsole("Web Server", "We live on " + PORT);
});