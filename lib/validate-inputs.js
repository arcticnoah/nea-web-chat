// -= File Info =-
// Functions that validate various inputs from the user to ensure they
// meet requirements set, reducing various tasks potential workloads

// -= Import decelerations =-

// -= Constant decelerations =-

const MAX_LENGTH = 1000;

// -= Function decelerations =-

// ... checkLength (used in other functions)
// Checks if input's length is between 'minimumLength' and 'maximumLength'. Ff
// it passes, then it returns the input, else it returns why it failed
function checkLength(input, minimumLength, maximumLength) {
    if (input.length >= minimumLength) {
        if (input.length <= maximumLength) {
            return input;
        } else {
            // Too long
            return `Too long, by: ${input.length - maximumLength} character(s)`;
        }
    } else {
        // Too short
        return `Too short, by: ${minimumLength - input.length} character(s)`;
    }
}

// ... checkText (used in web client and other functions)
// Cleans the input from potential SQL injection, unsupported characters
// and large amounts of text
function cleanText(input) {
    if (input){
        input = input.substring(0, MAX_LENGTH - 1); // Trim input to first 'MAX_LENGTH' characters
        // TODO: Remove potential sql injections
        // TODO: Remove unsupported characters
        return input;
    } else {
        return "";
    }
}

// ... checkEmail (used in web server and web client)
// Checks if 'input' string has a local-part, an '@' character present and ends with a
// valid domain. It returns true if it passes, else it returns the first issue it finds
// 'input' should follow: "local-part@domain"
// Example 1: "test@test.com" returns "test@test.com"
// Example 2: "test@test" return "Invalid domain (part after @)"
function checkEmail(input) {
    // See https://en.wikipedia.org/wiki/Email_address#Syntax for email address syntax
    input = cleanText(input);
    inputLength = checkLength(input, 5, 128);
    if (inputLength === input) {
        // Gets the position of '@' in the string, for checking if its present and splitting
        // the string to check each part individually
        indexOfSeparator = input.indexOf('@');
        if (indexOfSeparator > 0) {
            // '@' character is present and not at index 0
            localPart = input.substring(0, indexOfSeparator);
            if (/^[\x00-\x7F]*$/.test(localPart) === true) {
                // Local-part is valid
                domain = input.substring(indexOfSeparator + 1);
                if (/^[\x00-\x7F]*$/.test(domain) === true && domain.indexOf('.') != -1 && domain.indexOf('.') < domain.length - 1) {
                    // Domain is valid, so input is valid
                    return [input, true];
                } else {
                    return ["Invalid domain (part after @)", false];
                }
            } else {
                return ["Invalid local-part (part before @)", false];
            }
        } else {
            return ["No @ character or local-part (part before @)", false];
        }
    } else {
        return [inputLength, false];
    }
}

// ... checkUsername (used in web server and web client)
// Checks if 'input' string is between 1 to 16 characters long. Returns the 'input'
// if it passes, else it returns info on why it failed
function checkUsername(input) {
    input = cleanText(input);
    inputLength = checkLength(input, 1, 16);
    if (inputLength === input) {
        // Within length range
        return [input, true];
    } else {
        return [inputLength, false];
    }
}

// ... checkPassword (used in web server and web client)
// Checks if input string is between 6 to 32 characters long, if it passes then it
// checks for specific sets of characters in the string and updates 'passwordStrength'
// appropriately depending if it passes a specific set or not. Then 'passwordStrength'
// is returned unless it failed the length range, where it returns why it failed
function checkPassword(input) {
    input = cleanText(input);
    inputLength = checkLength(input, 8, 32);
    if (inputLength === input) {
        // Within length range
        let matchChars = new Array();
        matchChars.push("[A-Z]"); // Upper case letters
        matchChars.push("[a-z]"); // Lower case letters
        matchChars.push("[0-9]"); // Numbers
        matchChars.push("[$@$!%*#?&]"); // Special characters

        // Total password strength:
        // 0, 1: Unaccepted strength password
        // 2: Weak strength password
        // 3: Medium strength password
        // 4: Strong strength password
        let passwordStrength = [0, 0, 0, 0];
        let passwordStrengthTotal = 0;

        for (let i = 0; i < matchChars.length; i++) {
            if (new RegExp(matchChars[i]).test(input)) {
                // Checks each index of 'matchChars', and checks if any of the
                // characters are present in 'input', and increases the appropriate
                // 'passwordStrength' value by 1 if it is
                passwordStrength[i] += 1;
                passwordStrengthTotal += 1;
            }
        }
        
        // TODO: Create list of reasons why it failed
        if (passwordStrengthTotal >= 3) {
            return [passwordStrength, true];
        } else {
            return [passwordStrength, false];
        }

    } else {
        return [inputLength, false];
    }
}

// ... checkImage (used in web server, web client and chat server)
// TODO: Do this
function checkImage(input) {

}

// ... checkInviteCode (used in web server and web client)
// Checks if 'input' string is a valid invite code. If it passes, the input is
// returned, else it returns the first reason why it fails
// 'input' should have 8 alphanumeric characters
// Example 1: "w10lq952" returns "w10lq952"
// Example 2: "w10lq952%" returns "Too long, by: 1 character(s)"
// Example 3: "WL0LQ952" returns "Invalid invite code"
function checkInviteCode(input) {
    input = cleanText(input);
    inputLength = checkLength(input, 8, 8);
    if (inputLength === input) {
        // Within range
        if (/^[a-z0-9]+$/.test(input)) {
            // Valid invite code
            return [input, true];
        } else {
            return ["Invalid invite code", false];
        }
    } else {
        return [inputLength, false];
    }
}

// ... checkEmailCode (used in web server and web client)
// Checks if 'input' string is a valid invite code. If it passes, the input is
// returned, else it returns the first reason why it fails
// 'input' should have 6 numeric characters
// Example 1: "351089" returns "351089"
// Example 2: "35108" returns "Too short, by: 1 character(s)"
// Example 3: "35108a" returns "Invalid email code"
function checkEmailCode(input) {
    input = cleanText(input);
    inputLength = checkLength(input, 6, 6);
    if (inputLength === input) {
        // Within range
        if (/^[0-9]+$/.test(input)) {
            // Valid email code
            return [input, true];
        } else {
            return ["Invalid email code", false];
        }
    } else {
        return [inputLength, false];
    }
}

// -= Exports =-

exports.cleanText = cleanText;
exports.checkEmail = checkEmail;
exports.checkUsername = checkUsername;
exports.checkPassword = checkPassword;
exports.checkImage = checkImage;
exports.checkInviteCode = checkInviteCode;
exports.checkEmailCode = checkEmailCode;

// export { checkEmail}