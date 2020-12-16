// -= File Info =-
// ...

// -= Import decelerations =-

import { cleanText, checkInviteCode } from "../lib/validate-inputs.js"; // checkLength, checkEmail, checkUsername, checkPassword, checkEmailCode

// -= Constant decelerations =-

const TYPING_INTERVAL = 250; // Milliseconds
// TODO: Get from web_server
const WEBSERVERURL = "localhost:8000";
const IP = "localhost:8080"; // Used for testing

// -= Variable decelerations =-

let userName = document.getElementById("user-profile-username").textContent;
let userID = document.getElementById("user-profile-id").textContent;
let sockets = [];
let serverList = [];
let activeServer;
let typingTimer;

let width = document.body.clientWidth;
let contentDetailsColumnHide = true;

let messageList = document.getElementById("message-list-container");
let originalHeight = messageList.scrollHeight;

// -= Better mobile support =-

window.onresize = function (event) {
	width = document.body.clientWidth;

	updateUIBehaviourStyles();
};

function updateUIBehaviourStyles() {
	let contentDetailsColumnElement = document.getElementById(
		"content-details-column"
	);

	if (width <= 475 && !contentDetailsColumnHide) {
		contentDetailsColumnElement.classList.add("hide");

		contentDetailsColumnHide = true;
	} else if (width > 475 && contentDetailsColumnHide) {
		contentDetailsColumnElement.classList.remove("hide");

		contentDetailsColumnHide = false;
	}
}

updateUIBehaviourStyles();

// -= Setup modals =-

function setTypingDoneEvent(elementName) {
	let elementInput = document.getElementById(`${elementName}-input`);
	let elementIcon = document.getElementById(`${elementName}-icon`);

	setButtonState(elementName);

	elementInput.addEventListener("keyup", () => {
		clearTimeout(typingTimer);
		elementIcon.classList.remove(
			"fa-check",
			"fa-times",
			"fa-circle",
			"spinner-border"
		);
		if (elementInput.value) {
			elementIcon.classList.add("fa-circle");
			typingTimer = setTimeout(function () {
				typingDone(elementName);
			}, TYPING_INTERVAL);
		}
	});
}

function setButtonState(elementName) {
	if (elementName == "create-server-channel-modal-name") {
		$("#create-server-channel-button").prop("disabled", true);
	} else if (elementName == "edit-server-channel-modal-name") {
		$("#edit-server-channel-button").prop("disabled", true);
	} else if (elementName == "server-add-modal-invite") {
		$("#server-add-confirm-button").prop("disabled", true);
	}
}

async function typingDone(elementName) {
	let elementInput = document.getElementById(`${elementName}-input`);
	let elementIcon = document.getElementById(`${elementName}-icon`);

	elementIcon.classList.remove(
		"fa-check",
		"fa-times",
		"fa-circle",
		"spinner-border"
	);
	elementIcon.classList.add("spinner-border");

	if (elementName == "create-server-channel-modal-name") {
		// Check if 'elementInput' text exists in 'channels'
		let exists = false;
		for (let i = 0; i < sockets[activeServer].channels.length; i++) {
			if (
				sockets[activeServer].channels[i].channel_name ==
				elementInput.value
			) {
				exists = true;
			}
		}

		if (exists) {
			$("#create-server-channel-button").prop("disabled", true);
			elementIcon.classList.remove(
				"fa-check",
				"fa-times",
				"fa-circle",
				"spinner-border"
			);
			elementIcon.classList.add("fa-times");
		} else {
			$("#create-server-channel-button").prop("disabled", false);
			elementIcon.classList.remove(
				"fa-check",
				"fa-times",
				"fa-circle",
				"spinner-border"
			);
			elementIcon.classList.add("fa-check");
		}
	} else if (elementName == "edit-server-channel-modal-name") {
		let exists = false;
		for (let i = 0; i < sockets[activeServer].channels.length; i++) {
			if (
				sockets[activeServer].channels[i].channel_name ==
				elementInput.value
			) {
				exists = true;
			}
		}

		if (exists) {
			$("#edit-server-channel-button").prop("disabled", true);
			elementIcon.classList.remove(
				"fa-check",
				"fa-times",
				"fa-circle",
				"spinner-border"
			);
			elementIcon.classList.add("fa-times");
		} else {
			$("#edit-server-channel-button").prop("disabled", false);
			elementIcon.classList.remove(
				"fa-check",
				"fa-times",
				"fa-circle",
				"spinner-border"
			);
			elementIcon.classList.add("fa-check");
		}
	} else if (elementName == "server-add-modal-invite") {
		let pass = checkInviteCode(elementInput.value);

		if (pass[1]) {
			$("#server-add-confirm-button").prop("disabled", false);
			elementIcon.classList.remove(
				"fa-check",
				"fa-times",
				"fa-circle",
				"spinner-border"
			);
			elementIcon.classList.add("fa-check");
		} else {
			$("#server-add-confirm-button").prop("disabled", true);
			elementIcon.classList.remove(
				"fa-check",
				"fa-times",
				"fa-circle",
				"spinner-border"
			);
			elementIcon.classList.add("fa-times");
		}
	}
}

// -= UI Toggle Buttons =-

let serverDetailsToggleButton = document.getElementById(
	"server-details-toggle"
);
let serverDetailsInsideToggleButton = document.getElementById(
	"server-details-inside-toggle"
);
let serverDetailsToggle = false;
let userListToggleButton = document.getElementById("user-list-toggle");
let userListToggle = false;

function toggleDisplay(id) {
	let serverDetailsColumnElement = document.getElementById(
		"server-details-column"
	);
	let userListColumnElement = document.getElementById("user-list-column");
	let contentDetailsColumnElement = document.getElementById(
		"content-details-column"
	);

	if (id === 0) {
		if (contentDetailsColumnHide) {
			contentDetailsColumnElement.classList.remove("hide");

			serverDetailsInsideToggleButton.classList.remove("hide");
		} else {
			serverDetailsInsideToggleButton.classList.add("hide");
		}

		if (serverDetailsToggle) {
			serverDetailsColumnElement.classList.add("hide");
			serverDetailsColumnElement.classList.remove("show");

			serverDetailsToggle = false;
			serverDetailsToggleButton.classList.remove("active");
		} else {
			if (userListToggle) {
				userListColumnElement.classList.add("hide");
				userListColumnElement.classList.remove("show");

				userListToggle = false;
				userListToggleButton.classList.remove("active");
			}

			serverDetailsColumnElement.classList.remove("hide");
			serverDetailsColumnElement.classList.add("show");

			if (contentDetailsColumnHide) {
				contentDetailsColumnElement.classList.add("hide");

				serverDetailsColumnElement.setAttribute(
					"style",
					"min-width: 0px !important;\nmax-width: 100% !important"
				);
			}

			serverDetailsToggle = true;
			serverDetailsToggleButton.classList.add("active");
		}
	} else if (id === 1) {
		if (userListToggle) {
			userListColumnElement.classList.add("hide");
			userListColumnElement.classList.remove("show");

			userListToggle = false;
			userListToggleButton.classList.remove("active");
		} else {
			if (serverDetailsToggle) {
				serverDetailsColumnElement.classList.add("hide");
				serverDetailsColumnElement.classList.remove("show");

				serverDetailsToggle = false;
				serverDetailsToggleButton.classList.remove("active");
			}

			userListColumnElement.classList.remove("hide");
			userListColumnElement.classList.add("show");

			userListToggle = true;
			userListToggleButton.classList.add("active");
		}
	}
}

$(serverDetailsToggleButton).click(function () {
	toggleDisplay(0);
});

$(serverDetailsInsideToggleButton).click(function () {
	toggleDisplay(0);
});

$(userListToggleButton).click(function () {
	toggleDisplay(1);
});

// -= Server Channel Modal =-

setTypingDoneEvent("create-server-channel-modal-name");

let createServerChannelModalButton = document.getElementById(
	"server-channels-button"
);
let createServerChannelModalSubmitButton = document.getElementById(
	"create-server-channel-button"
);

$(createServerChannelModalButton).click(function () {
	$("#create-server-channel-modal").modal("show");
});

// -= Web Server Communication =-

async function fetchGet(URL) {
	return await fetch(URL)
		.then((response) => response.json())
		.then(function (json) {
			return json;
		});
}

async function fetchPost(URL, body) {
	var formBody = [];

	for (var property in body) {
		var encodedKey = encodeURIComponent(property);
		var encodedValue = encodeURIComponent(body[property]);
		formBody.push(encodedKey + "=" + encodedValue);
	}

	formBody = formBody.join("&");

	return await fetch(URL, {
		method: "POST",
		body: formBody,
		headers: {
			"Content-type": "application/x-www-form-urlencoded",
		},
	})
		.then((response) => response.json())
		.then(function (json) {
			return json;
		});
}

function getUserName(userArray, ID) {
	for (let i = 0; i < userArray.length; i++) {
		if (userArray[i].user_id == ID) {
			return userArray[i].user_name;
		}
	}
}

function timeOutput(input) {
	return new Date(input).toLocaleTimeString("en-us", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

function createUserCards(socket, userArray) {
	$("#online-users-list-group").children().remove();
	$("#away-users-list-group").children().remove();
	$("#offline-users-list-group").children().remove();

	for (let i = 0; i < userArray.length; i++) {
		createUserCard(socket, userArray[i]);
	}
}

function createUserCard(socket, user) {
	let userCard = $("<div>");
	let userImage = $("<img>");

	if (user.user_haspicture == 1) {
		userImage.attr("src", `../data/user/${user.user_id}.png`);
	} else {
		userImage.attr("src", `../data/user/default.png`);
	}

	let userText = $("<div>");
	let userName = $("<p>").text(user.user_name);
	let userTime = $("<p>");

	userCard.attr("class", "row user-list-card");
	userImage.attr("class", "user-list-image");
	userText.attr("class", "user-list-text");
	userName.attr("class", "user-list-name");
	userTime.attr("class", "user-list-time");

	$(userCard).click(function () {
		socket.emit("create user channel", user);
	});

	if (user.user_status == 1) {
		// If a user hasn't sent anything for 20 minutes = (1000 * 60 * 20) milliseconds, they're considered away
		if (user.user_onlinetime + 1200000 > new Date().getTime()) {
			// User online
			userTime.text("Online");

			userText.append(userName);
			userText.append(userTime);

			userCard.append(userImage);
			userCard.append(userText);

			$("#online-users-list-group").append(userCard);
		} else {
			// User away
			userTime.text("Away");

			userText.append(userName);
			userText.append(userTime);

			userCard.append(userImage);
			userCard.append(userText);
			$("#away-users-list-group").append(userCard);
		}
	} else {
		// User offline
		userTime.text("Offline");

		userText.append(userName);
		userText.append(userTime);

		userCard.append(userImage);
		userCard.append(userText);
		$("#offline-users-list-group").append(userCard);
	}
}

function createServerButtons() {
	$("#server-list-container").children().remove();

	for (let serverIndex = 0; serverIndex < serverList.length; serverIndex++) {
		createServerButton(serverIndex);
	}
}

function createServerButton(serverListIndex) {
	let server = serverList[serverListIndex];
	let isConnected = sockets[serverListIndex].connected;

	let serverButton = $("<div>");
	let serverImage = $("<img>");

	if (server.server_haspicture == 1) {
		serverImage.attr("src", `../data/server/${server.server_id}.png`);
	} else {
		serverImage.attr("src", `../data/server/default.png`);
	}

	if (isConnected == true) {
		if (serverListIndex == activeServer) {
			serverButton.attr("class", "server-button active");
		} else {
			serverButton.attr("class", "server-button");
			$(serverButton).click(function () {
				changeActiveServer(serverListIndex);
				sockets[serverListIndex].emit("get messages", 0);
			});
		}
	} else {
		serverButton.attr("class", "server-button inactive");
	}
	serverImage.attr("class", "server-button-image");
	serverButton.attr("id", `server-${serverListIndex}`);

	serverButton.append(serverImage);
	$("#server-list-container").append(serverButton);
}

function createChannelButtons(socket, channelArray) {
	$("#server-channels-group").children().remove();
	$("#user-channels-group").children().remove();

	for (let j = 0; j < channelArray.length; j++) {
		if (channelArray[j] !== null) {
			if (channelArray[j].channel_name == socket.currentChannelName) {
				createChannelButton(socket, channelArray[j], true);
			} else {
				createChannelButton(socket, channelArray[j], false);
			}
		}
	}
}

function createChannelButton(socket, channel, active) {
	var display_channel_name = channel.channel_name;

	if (channel.channel_type == 1) {
		// Trim the channel name to only contain the last 'section' which is the usernames
		display_channel_name = display_channel_name.substring(1);
		display_channel_name = display_channel_name.substring(
			display_channel_name.indexOf("_") + 1
		);
		display_channel_name = display_channel_name.substring(
			display_channel_name.indexOf("_") + 1
		);
	}

	let channelContainer = $("<div>");
	let channelMainButton = $("<a>").text(display_channel_name);

	if (active) {
		$("#channel-bar-name").text(display_channel_name);
		$("#channel-bar-description").text(channel.channel_description);
		channelContainer.attr("class", "btn channel-button active");
		channelMainButton.attr("pressed", true);
	} else {
		channelContainer.attr("class", "btn channel-button");
	}

	$(channelMainButton).click(function () {
		if (channelMainButton.attr("pressed") !== "true") {
			channelMainButton.attr("pressed", true);
			socket.emit("connect channel", channel.channel_name);
		} else {
			socket.emit("get channels", null);
		}
	});

	channelContainer.append(channelMainButton);

	if (channel.channel_name !== "general" && channel.channel_type == 0) {
		if (active) {
			channelContainer.attr(
				"class",
				"btn channel-button channel-button-with-extras active"
			);
		} else {
			channelContainer.attr(
				"class",
				"btn channel-button channel-button-with-extras"
			);
		}

		let channelExtraButtonsContainer = $("<div>");
		let channelEditButton = $("<a>");

		channelEditButton.attr("class", "channel-extra-button fas fa-edit");

		$(channelEditButton).click(function () {
			socket.emit("get channels", null);

			$("#edit-server-channel-modal-name-input").val(
				channel.channel_name
			);
			$("#edit-server-channel-modal-description-input").val(
				channel.channel_description
			);

			$("#edit-server-channel-button").click(function () {
				let channelName = document.getElementById(
					"edit-server-channel-modal-name-input"
				).value;
				let channelDescription = document.getElementById(
					"edit-server-channel-modal-description-input"
				).value;
				socket.emit("edit channel", [
					channel.channel_name,
					channelName,
					channelDescription,
				]);
				$("#edit-server-channel-modal").modal("hide");
			});

			$("#delete-server-channel-button").click(function () {
				socket.emit("delete channel", channel.channel_name);
				$("#edit-server-channel-modal").modal("hide");
			});

			$("#edit-server-channel-modal").modal("show");

			setTypingDoneEvent("edit-server-channel-modal-name");
			$("#edit-server-channel-button").prop("disabled", false);
		});

		channelExtraButtonsContainer.append(channelEditButton);
		channelContainer.append(channelExtraButtonsContainer);
	}

	$("#server-channels-group").unbind("click");
	$("#user-channels-group").unbind("click");

	if (channel.channel_type == 0) {
		$("#server-channels-group").append(channelContainer);
	} else {
		$("#user-channels-group").append(channelContainer);
	}
}

function createMessage(messageData, backFront) {
	// backFront: '0' = append, '1' = prepend
	let msgContainer = $("<div>");
	let msgUser = $("<div>");
	let msgUserName = $("<p>").text(
		getUserName(sockets[activeServer].users, messageData.user_id)
	);
	let msgContent = $("<div>");
	let msgText = $("<div>").text(messageData.message_content);
	let msgTime = $("<p>").text(timeOutput(messageData.time));

	msgContainer.attr("class", "msg-container");
	msgContainer.attr("id", `msg-${messageData.message_id}`);
	msgUser.attr("class", "msg-user");
	msgUserName.attr("class", "msg-user-name");
	msgContent.attr("class", "msg");

	if (messageData.user_id == userID) {
		// Local user message
		msgText.attr("class", "msg-text local-msg-text");
		msgTime.attr("class", "msg-time local-msg-time");

		// TODO: add in-element button to edit and delete the message

		msgUser.append(msgUserName);

		msgContent.append(msgText);
		msgContent.append(msgTime);

		msgContainer.append(msgUser);
		msgContainer.append(msgContent);
	} else {
		// Other users message
		msgText.attr("class", "msg-text other-user-msg-text");
		msgTime.attr("class", "msg-time other-user-msg-time");

		// TODO: add in-element button to report the message

		msgUser.append(msgUserName);

		msgContent.append(msgText);
		msgContent.append(msgTime);

		msgContainer.append(msgContent);
		msgContainer.append(msgUser);
	}

	if (backFront == 0) {
		$("#message-list-container").append(msgContainer);
		messageList.scrollTop =
			messageList.scrollHeight - messageList.clientHeight;
	} else {
		$("#message-list-container").prepend(msgContainer);
		messageList.scrollTop = messageList.scrollHeight - originalHeight;
	}
}

function scrollUpEvent() {
	if (
		messageList.scrollTop === 0 &&
		!sockets[activeServer].changingChannel &&
		messageList.scrollHeight !== messageList.clientHeight
	) {
		sockets[activeServer].emit(
			"get messages",
			messageList.childNodes.length
		);
	}
}

function changeActiveServer(index) {
	$("#server-channels-group").children().remove();
	$("#user-channels-group").children().remove();
	$("#message-list-container").children().remove();
	$("#online-users-list-group").children().remove();
	$("#away-users-list-group").children().remove();
	$("#offline-users-list-group").children().remove();

	$("#message-box-send-button").prop("disabled", true);

	activeServer = index;

	$("#server-name-text").text(serverList[activeServer].server_name);

	sockets[activeServer].emit("get channels", null);
	sockets[activeServer].emit("get users", null);

	$("#message-box-send-button").prop("disabled", false);

	createServerButtons();
}

function showServerAddModal() {
	setTypingDoneEvent("server-add-modal-invite");
	$("#server-add-modal").modal("show");

	$("#server-add-confirm-button").click(function () {
		fetchPost(`http://${WEBSERVERURL}/userjoinchatserver`, {
			inviteCode: $("#server-add-modal-invite-input")[0].value,
			password: $("#server-add-modal-password-input")[0].value,
		}).then(function (result) {
			$("#server-add-modal").modal("hide");
			serverList.push(result);
			setupSocket(serverList.length - 1);
		});
	});
}

function showServerBrowserModal() {
    let serverBrowserCardContainer = document.getElementById("server-browser-card-container");
    $(serverBrowserCardContainer).children().remove();

    fetchGet(`http://${WEBSERVERURL}/getpublicserverlist`).then(function (response) {
        for (let i = 0; i < response.length; i++) {
            let serverCard = $("<div>");
            let serverCardIcon = $("<img>");
            let serverDetailsContainer = $("<div>");
            let serverDetailsName = $("<p>").text(response[i].server_name);
			let serverOptionsContainer = $("<div>");
			let serverOptionsJoinButton = $("<button>");

            if (response[i].server_haspicture == 1) {
                serverCardIcon.attr("src", `../data/server/${response[i].server_id}.png`);
            } else {
                serverCardIcon.attr("src", `../data/server/default.png`);
            }

            let alreadyJoined = false;

            for (let j = 0; j < serverList.length; j++) {
                if (response[i].server_id == serverList[j].server_id) {
                    alreadyJoined = true;
                    break;
                }
            }

            if (alreadyJoined) {
				$(serverCard).attr("class", "server-browser-server-card server-browser-server-card-joined row");
				
				$(serverOptionsJoinButton).text("Joined");
				$(serverOptionsJoinButton).prop("disabled", true);
            } else {
				$(serverCard).attr("class", "server-browser-server-card row");
				
				$(serverOptionsJoinButton).text("Join");
				$(serverCard).click(function() {
					fetchPost(`http://${WEBSERVERURL}/userjoinchatserver`, {
						inviteCode: response[i].server_invite,
						password: "",
					}).then(function (result) {
						$("#server-browser-modal").modal("hide");
						serverList.push(response[i]);
						setupSocket(serverList.length - 1);
					});
				});
            }

            $(serverCardIcon).attr("class", "server-browser-server-icon");
            $(serverDetailsContainer).attr("class", "server-browser-server-details-container");
            $(serverDetailsName).attr("class", "server-browser-server-name");
			$(serverOptionsContainer).attr("class", "server-browser-server-options-container");
			$(serverOptionsJoinButton).attr("class", "btn active");

			$(serverDetailsContainer).append(serverDetailsName);
			
			$(serverOptionsContainer).append(serverOptionsJoinButton);

            $(serverCard).append(serverCardIcon);
            $(serverCard).append(serverDetailsContainer);
            $(serverCard).append(serverOptionsContainer);

            $(serverBrowserCardContainer).append(serverCard);
        }

        $("#server-browser-modal").modal("show");
    });
}

function showServerInviteModal() {
	$("#server-invite-modal-body").children().remove();
	
	$("#server-invite-modal-title").text(serverList[activeServer].server_name);
	let inviteCode = $("<p>").text(`Invite Code: ${serverList[activeServer].server_invite}`);

	$(inviteCode).attr("class", "server-invite-modal-code");

	$("#server-invite-modal-body").append(inviteCode)

	$("#server-invite-modal").modal("show");
}

$(window).on("load", function () {
	fetchGet(`http://${WEBSERVERURL}/usergetservers`).then(function (response) {
		serverList = response;

		if (serverList.length > 0) activeServer = 0;

		let waitForServer = setInterval(function () {
			if (serverList.length !== undefined) {
				clearInterval(waitForServer);

				$("#preloader").fadeOut("slow");

				$("#server-add-button").prop("disabled", false);
				$("#server-add-button").click(function () {
					showServerAddModal();
				});

				$("#server-browser-button").prop("disabled", false);
				$("#server-browser-button").click(function () {
					showServerBrowserModal();
				});

				let waitForActiveServer = setInterval(function () {
					if (activeServer !== undefined) {
						clearInterval(waitForActiveServer);
						startApp();
					}
				}, 100);
			}
		}, 100);
	});
});

function setupSocket(i) {
	sockets.push(io(serverList[i].server_url));

	sockets[i].connected = false;
	sockets[i].serverLocalID = i;
	sockets[i].users = [];
	sockets[i].channels = [];

	sockets[i].on("connect", () => {
		sockets[i].connected = true;
		createServerButtons();
		sockets[i].emit("user connect", [userName, userID]);
	});

	sockets[i].on("user connect", (data) => {
		sockets[i].currentChannelName = data;
		sockets[i].emit("connect channel", data);
	});

	// TODO: change disconnected socket to dim the server icon, add a little indicator and disable the buttons for that server
	sockets[i].on("disconnect", () => {
		sockets[i].connected = false;
		createServerButtons();
		// TODO: dim and disable the server button
		// TODO: change active server if possible, else active the preloader again
		sockets[i].reconnectTimer = setInterval(function () {
			sockets[i].open();
			if (!sockets[i].disconnected) {
				sockets[i].connected = true;
				createServerButtons();
				clearInterval(sockets[i].reconnectTimer);
			}
		}, 5000);
	});

	sockets[i].on("connect channel", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			sockets[activeServer].changingChannel = true;

			$("#message-list-container").children().remove();

			sockets[activeServer].currentChannelName = data;

			createChannelButtons(
				sockets[activeServer],
				sockets[activeServer].channels
			);

			sockets[activeServer].emit("get messages", 0);
			sockets[activeServer].changingChannel = false;
		}
	});

	sockets[i].on("get messages", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			originalHeight = messageList.scrollHeight;

			for (let j = data.length - 1; j > -1; j--) {
				createMessage(data[j], 1);
			}
		}
	});

	sockets[i].on("channel list", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			sockets[activeServer].channels = data;

			createChannelButtons(
				sockets[activeServer],
				sockets[activeServer].channels
			);
		}
	});

	sockets[i].on("user list", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			sockets[activeServer].users = data;

			createUserCards(
				sockets[activeServer],
				sockets[activeServer].users
			);

			setTimeout(function () {
				createUserCards(
					sockets[activeServer],
					sockets[activeServer].users
				);
			}, 10000);
		}
	});

	sockets[i].on("delete channel", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			sockets[activeServer].emit("connect channel", data);
		} else {
			sockets[i].currentChannelName = data;
		}
	});

	sockets[i].on("ask channel list", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			sockets[activeServer].emit("get channels", null);
		}
	});

	sockets[i].on("channel list", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			sockets[activeServer].channels = data;

			createChannelButtons(
				sockets[activeServer],
				sockets[activeServer].channels
			);
		}
	});

	sockets[i].on("send message", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			createMessage(data, 0);
		} else {
			// TODO: display a notification
		}
	});

	// change on server change
	sockets[i].on("delete message", (data) => {
		if (sockets[i].serverLocalID == activeServer) {
			$(`#msg-${data}`).remove();
		}
	});
}

function startApp() {
	$("#server-invite-button").prop("disabled", false);
	$("#server-invite-button").click(function () {
		showServerInviteModal();
	});

	$("#message-box-text-input").prop("disabled", false);

	// -= Socket Setup =-

	for (let i = 0; i < serverList.length; i++) {
		setupSocket(i);
	}

	changeActiveServer(activeServer);

	messageList.addEventListener("scroll", scrollUpEvent);

	$("#message-box-form").submit((e) => {
		e.preventDefault();

		let inputText = $("#message-box-text-input").val();
		inputText = cleanText(inputText);

		if (inputText != "") {
			let data = { message_content: inputText, time: Date.now() };

			sockets[activeServer].emit("send message", data);

			$("#message-box-text-input").val("");
		}
	});

	$(createServerChannelModalSubmitButton).click(function () {
		let channelName = document.getElementById(
			"create-server-channel-modal-name-input"
		).value;
		let channelDescription = document.getElementById(
			"create-server-channel-modal-description-input"
		).value;
		sockets[activeServer].emit("create channel", [
			channelName,
			channelDescription,
			0,
		]);
		sockets[activeServer].emit("connect channel", channelName);
		$("#create-server-channel-modal").modal("hide");
	});
}
