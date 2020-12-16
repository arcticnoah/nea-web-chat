// -= File Info =-
// ...

// -= Import decelerations =-

import { cleanText, checkLength, checkEmail, checkUsername, checkPassword, checkEmailCode } from "../lib/validate-inputs.js";

// -= Constant decelerations =-

const TYPING_INTERVAL = 500; // Milliseconds

// -= Variable decelerations =-

let tooltipSettings = {"trigger": "manual", 
                       "placement": "right",
                       "offset": "[-1, 5]",
                       "title": "CHANGE ME"};

let loginInputs = {"login-username": 0,
                   "login-password": 0};

let signupInputs = {"signup-email": 0,
                    "signup-username": 0,
                    "signup-password": 0,
                    "signup-passwordconfirmation": 0,
                    "signup-emailcode": 0};

let typingTimer;

// -= Function decelerations =-

async function fetchAsync(url) {
    let response = await fetch(url);
    let data = await response.json();
    return data;
}

function setTooltipMessage(elementID, message) {
    tooltipSettings.title = message;
    $(`#${elementID}`).tooltip('dispose');
    $(`#${elementID}`).tooltip(tooltipSettings);
}

function setTypingDoneEvent(elementName) {
    let elementInput = document.getElementById(`${elementName}-input`);
    let elementIcon = document.getElementById(`${elementName}-icon`);

    setButtonState();

    elementInput.addEventListener("keyup", () => {
        clearTimeout(elementName.typingTimer);
        elementIcon.classList.remove("fa-check", "fa-times", "fa-circle", "spinner-border");
        if (elementInput.value) {
            elementIcon.classList.add("fa-circle");
            elementName.typingTimer = setTimeout(function() {
                typingDone(elementName);
            }, TYPING_INTERVAL);
        }
    });
}

function setInputPass(elementName, value) {
    if (elementName.includes("signup")) {
        // Signup element
        signupInputs[elementName] = value;
    } else {
        // Login element
        loginInputs[elementName] = value;
    }
}

async function sendEmailCode() {
    if (signupInputs["signup-email"] === 1 && signupInputs["signup-username"] === 1 && signupInputs["signup-password"] === 1 && signupInputs["signup-passwordconfirmation"] === 1 && signupInputs["signup-emailcode"] === 0) {
        // All previous inputs are valid
        // Send api request to server for email code
        let signupEmail = document.getElementById(`signup-email-input`);
        return await fetchAsync("/sendcreateuseremailcode:" + signupEmail.value).then(function(result) {
            return result;
        });
    }

    return false;
}

function setButtonState() {
    if (loginInputs["login-username"] === 1 && loginInputs["login-password"] === 1) {
        $("#login-button").prop('disabled', false);
    } else {
        $("#login-button").prop('disabled', true);
    }

    if (signupInputs["signup-email"] === 1 && signupInputs["signup-username"] === 1 && signupInputs["signup-password"] === 1 && signupInputs["signup-passwordconfirmation"] === 1 && signupInputs["signup-emailcode"] === 1) {
        $("#signup-button").prop('disabled', false);
    } else {
        $("#signup-button").prop('disabled', true);
    }
}

async function typingDone(elementName) {
    let validateOutput, elementType;
    let elementInput = document.getElementById(`${elementName}-input`);
    let elementIcon = document.getElementById(`${elementName}-icon`);

    elementIcon.classList.remove("fa-check", "fa-times", "fa-circle", "spinner-border");
    elementIcon.classList.add("spinner-border");

    // Validate input
    if (elementName.includes("emailcode")) {
        elementType = "emailcode";
        validateOutput = checkEmailCode(elementInput.value);
    } else if (elementName.includes("username")) {
        elementType = "username";
        validateOutput = checkUsername(elementInput.value);
    } else if (elementName.includes("passwordconfirmation")) {
        elementType = "passwordconfirmation";
        let signupPasswordInput = document.getElementById("signup-password-input");
        if (elementInput.value !== signupPasswordInput.value) {
            validateOutput = ["Password doesn't match", false];
        } else {
            validateOutput = ["Password match", true];
        }
    } else if (elementName.includes("password")) {
        elementType = "password";
        validateOutput = checkPassword(elementInput.value);
    } else if (elementName.includes("email")) {
        elementType = "email";
        validateOutput = checkEmail(elementInput.value);   
    }

    if (!validateOutput[1]) {
        // Failed validation
        if (elementType !== "password" || typeof validateOutput[0] == "string") {
            setTooltipMessage((elementName + "-input"), validateOutput[0]);
        } else {
            let messageList = "";
            if (validateOutput[0][0] == 0) {
                messageList += "No upper-case characters\n";
            } if (validateOutput[0][1] == 0) {
                messageList += "No lower-case characters\n";
            } if (validateOutput[0][2] == 0) {
                messageList += "No number characters\n";
            } if (validateOutput[0][3] == 0) {
                messageList += "No special characters\n";
            }
            setTooltipMessage((elementName + "-input"), messageList);
        }
        setInputPass(elementName, 0);
        setButtonState();
        $(`#${elementName}-input`).tooltip("show");
        elementIcon.classList.remove("fa-check", "fa-times", "fa-circle", "spinner-border");
        elementIcon.classList.add("fa-times");
    } else {
        // Passed validation
        let pass = true;
        if (!elementName.includes("login")) {
            if (elementType !== "password" && elementType !== "passwordconfirmation" && elementType !== "emailcode") {
                await fetchAsync("/check" + elementType + ":" + elementInput.value).then(function(result) {
                    if (result) {
                        // Input already used
                        setTooltipMessage((elementName + "-input"), elementType.charAt(0).toUpperCase() + elementType.slice(1) + " already in use");
                        setInputPass(elementName, 0);
                        setButtonState();
                        $(`#${elementName}-input`).tooltip("show");
                        elementIcon.classList.remove("fa-check", "fa-times", "fa-circle", "spinner-border");
                        elementIcon.classList.add("fa-times");
                        pass = false;
                    }
                });
            }
        }
        if (pass) {
            // Input not in use
            // Passes all checks
            setInputPass(elementName, 1);
            setButtonState();
            $(`#${elementName}-input`).tooltip("hide");
            elementIcon.classList.remove("fa-check", "fa-times", "fa-circle", "spinner-border");
            elementIcon.classList.add("fa-check");
            // Send email code to email if all other inputs are passed
            await sendEmailCode().then(function(result) {
                if (result !== false) {
                    // Sent email code, display message
                    if (result !== "Success") {
                        $("#signup-emailcode-input").prop('disabled', true);
                        $('#email-code-modal-body-text').text(result);
                    } else {
                        $("#signup-emailcode-input").prop('disabled', false);
                        $('#email-code-modal-body-text').text("An email code has been sent to the input email address.");
                    }
                    $('#email-code-modal').modal('show');
                }   
            });
        }
    }
}

// -= UI slide animation =-

// Overlay slide animation with button triggers
// Code originating from: https://www.florin-pop.com/blog/2019/03/double-slider-sign-in-up-form/
const leftOverlayButton = document.getElementById("overlay-left-btn");
const rightOverlayButton = document.getElementById("overlay-right-btn");
const windowContainer = document.getElementById("container");

leftOverlayButton.addEventListener("click", () => {
    windowContainer.classList.remove("right-panel-active");
});

rightOverlayButton.addEventListener("click", () => {
    windowContainer.classList.add("right-panel-active");
});

// -= Main =-

// Preloader hide when loaded code
$(window).on("load", function () {
    $("#preloader").fadeOut("slow", function () {
        $(this).remove();
    });
});

// -= TMP =-

setTypingDoneEvent("login-username");
setTypingDoneEvent("login-password");

setTypingDoneEvent("signup-email");
setTypingDoneEvent("signup-username");
setTypingDoneEvent("signup-password");
setTypingDoneEvent("signup-passwordconfirmation");
setTypingDoneEvent("signup-emailcode");