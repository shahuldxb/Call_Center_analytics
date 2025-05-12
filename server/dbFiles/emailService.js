const nodemailer = require("nodemailer");
require("dotenv").config()
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER, // Replace with your email
    pass: process.env.EMAIL_PASS, // Replace with your generated App Password
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Email Transporter Error:", error);
  } else {
    console.log("Email Transporter is ready to send messages!");
  }
});

module.exports = transporter;
