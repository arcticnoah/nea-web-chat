# NEA Website-Based Chat App

<p align="center">
    <img src="logo.png">
</p>

> A website-based chat application, inspired by [Discord](https://discord.com/), created for my A-Level (2019-2020 Exam) Computer Science coursework. Its focus was on being privacy-friendly, by letting people host their own chat servers (which would store all the data) for their own communities, be it family, friends, group activities, etc. It was also very accessible, as all it required was a Javascript-enabled web browser with an active internet connection.

***Note:** The program is missing useful, key features since it was created for my A-Level coursework, which was cancelled in March 2020 due to COVID-19 and I haven't worked on it since.*

## Video/Screenshots

<p align="center">
    <img src="https://img.youtube.com/vi/aI1gW4By7SU/mqdefault.jpg" href="https://youtu.be/aI1gW4By7SU">
    <br>
    <br>
    <a href="https://youtu.be/aI1gW4By7SU">Click to watch the Youtube Video Demo</a>
</p>

<br>

![Screenshot 1](/screenshot1.png)

![Screenshot 2](/screenshot2.png)

![Screenshot 3](/screenshot3.png)

## Helpful/used resources

- [Socket.io Chat Example](https://github.com/socketio/socket.io/tree/master/examples/chat)
- The login/register page uses (only minorly edited) code from: https://www.florin-pop.com/blog/2019/03/double-slider-sign-in-up-form/

## License

[See license here](https://github.com/arcticnoah/nea-web-chat/blob/main/LICENSE)

## Known issues

- When a user joins their first chat server, the client will mistakenly think it's offline unless you reload the webpage
- Various aspects of the code aren't optimised, since I was prioritising features over polish
- Multiple active chat servers can break the UI at times 

## Pre-requisites

Make sure you have the following installed:

- Node.js (tested with v14)
- Python (tested with 3.8, needed for `sqlite3`, make sure its accessible via your `PATH`/environment variables)

***Note:** Only been actively tested on Windows, occasionally on Debian Linux.*

## How to install/run

Steps to install and run the project:

1.  Clone the repo
2.  In the root folder of the project, type the following command to install the dependencies:
```bash
$ npm install
```
3.  Run each command in a separate process/window/tab:
```bash
$ npm run web_server
```
```bash
$ npm run chat_server
```
4. Go to the address, http://localhost:8000 in your browser and on the login page, use the following details (for test purposes):
```
Username: testuser1, testuser2 or testuser3
Password: password123*
```
5. Once successfully logged in, you can join the chat server you're running by accessing the server selector in the top right, with the following icon:

![Image showing the server browser button](/server-browser.png)

## (Optional) Setting up an Gmail account for user email verification

To enable account registration, you need to create a Gmail account by [following these steps](https://nodemailer.com/usage/using-gmail/) to allow [Nodemailer](https://nodemailer.com/) to send emails from that account.

Then update the two constants, `EMAILADDRESS` and `EMAILPASSWORD` in [`client/server.js`]() with the Gmail account details for email verification to work.