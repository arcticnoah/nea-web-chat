// -= File Info =-
// ...

// -= Import decelerations =-

require("colors");

// -= Environment decelerations =-

process.env.doDebug = "true";

// -= Function decelerations =-

// ... PadString
function padString(input, width, pad) {
    pad = pad || '0';
    input = input + '';
    return input.length >= width ? input : new Array(width - input.length + 1).join(pad) + input;
}

// ... GetTimeString
function getTimeString() {
    let currentDate = new Date();

    let date = padString(currentDate.getDate(), 2) + "/" + padString(currentDate.getMonth() + 1, 2) + "/" + padString(currentDate.getFullYear(), 2);
    let time = padString(currentDate.getHours(), 2) + ":" + padString(currentDate.getMinutes(), 2) + ":" + padString(currentDate.getSeconds(), 2) + ":" + padString(currentDate.getMilliseconds(), 3);

    return date + " " + time;
}

// ... ColorConsole
function colorConsole(category, input) {
    if (process.env.doDebug == "true") {
        let timeStamp = getTimeString();
        
        if (input) {
            if (input.toLowerCase().includes("error")) {
                // Mark input red if contains error
                input = input.red;
            } else if (input.toLowerCase().includes("warning")) {
                // Make input yellow if contains warning
                input = input.yellow;
            }
        }
    
        if (category.includes("Debug")) {
            console.log(`[${timeStamp}] ` + `[${category}]       ` + input);
        } else if (category.includes("Client")) {
            console.log(`[${timeStamp}] ` + `[${category}]      `.green + input);
        } else if (category.includes("Web Server")) {
            console.log(`[${timeStamp}] ` + `[${category}]  `.blue + input);
        } else if (category.includes("Chat Server")) {
            console.log(`[${timeStamp}] ` + `[${category}] `.magenta + input);
        } else if (category.includes("Database")) {
            console.log(`[${timeStamp}] ` + `[${category}]    `.brightYellow + input);
        } else if (category.includes("Login")) {
            console.log(`[${timeStamp}] ` + `[${category}]       `.cyan + input);
        } else {
            // Act as if category is input
            console.log(`[${timeStamp}]               ` + category.gray);
        }
    }
}

exports.padString = padString;
exports.colorConsole = colorConsole;