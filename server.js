const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
var mysql = require("mysql");
const bodyParser = require("body-parser");
var path = require("path");
var multer = require("multer");
var crypto = require("crypto");

var storage = multer.diskStorage({
  destination: "./public/profPics/",
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      if (err) return cb(err);

      cb(null, raw.toString("hex") + path.extname(file.originalname));
    });
  },
});

var upload = multer({ storage: storage });

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "api_projekt",
});

conn.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database: " + err.stack);
    return;
  }
  console.log("Connected to MySQL database");
});

app.use(express.json());
app.use("/public", express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

function processUserInput(inputArray) {
  for (let input of inputArray) {
    if (!/^[a-zA-Z0-9.@]+#$/.test(input)) {
      return false;
    }
  }
  return true;
}

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const users = {};

var thisUserId = "";
app.post("/addUser", upload.single("profilePic"), (req, res) => {
  const { username, passwd, email } = req.body;
  const profilePic = req.file.filename;
  const insertQuery = `INSERT INTO users (username, passwd, email, profilepic) VALUES (?, ?, ?, ?)`;
  const values = [username, passwd, email, profilePic];
  // console.log(req.body, profilePic);
  const isValid = processUserInput(values);

  if (!isValid) {
    console.error("Error inserting data into the database: Invalid input. ");
    res.sendStatus(422);
    return;
  }

  conn.query(insertQuery, values, (err, result) => {
    if (err) {
      console.error("Error inserting data into the database: " + err.stack);
      res.sendStatus(500);
      return;
    }

    console.log("Inserted into database with ID: " + result.insertId);
    res.redirect("/");
    thisUserId = result.insertId;
  });
});

app.post("/logInUser", (req, res) => {
  const { username, passwd } = req.body;
  const logValues = [ username, passwd ];
  const findUserQuery = `SELECT * FROM users WHERE username = ? AND passwd = ?`

  const isValid = processUserInput(logValues);

  if (!isValid) {
    console.error("Error locating into the database: Invalid input. ");
    res.sendStatus(422);
    return;
  }

  conn.query(findUserQuery, logValues, (err, result) => {
    if (err) {
      console.error("Data not found in database: " + err.stack);
      res.sendStatus(404);
      return;
    }

    console.log("Located user from database with ID: " + result[0].id);
    res.redirect("/");
    thisUserId = result[0].id;
  });
});

app.get("/updateUserInfo", (req, res) => {
  const searchId = thisUserId;
  const UNQuery = `SELECT username, profilepic FROM users WHERE id = ?`;
  conn.query(UNQuery, searchId, (err, results) => {
    if (err) {
      console.error("Error retrieving data from the database: " + err.stack);
      res.sendStatus(500);
      return;
    }
    res.json(results);
  });
});

server.listen(5000, () => {
  console.log("listening on *:5000");
});
