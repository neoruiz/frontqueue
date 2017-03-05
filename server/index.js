var express = require('express');
var app = express();
var twilio = require("twilio/lib");
var bodyParser = require('body-parser');
var o2x = require('object-to-xml');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;

var accountSid = 'AC20b420b22c77df055bfad1c30f5a26a6'; // Your Account SID from www.twilio.com/console
var authToken = '80cfb397a4b615ae414f1b06fb066747';   // Your Auth Token from www.twilio.com/console

var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);

var actions = [ 'skip', 'update', 'cancel' ];

passport.use(new Strategy(
  function(username, password, cb) {
    db.users.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (user.password != password) { return cb(null, false); }
      return cb(null, user);
    });
  }));

passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.users.findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});

app.use(express.static('static'));
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ 
  extended: true
}));

app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

var queue = [
      {
        "queueId" : 123,
        "name": "Dr. Neo Ruiz",
        "description" : "Orthopedic",
        "prefix" : "B",
        "primaryImage" : "http://67.205.165.76:3000/img/doctor_1.jpg",
        "queue" : [
          { "id" : 1, "firstname" : 'Neo', "lastname" : "Ruiz", "phone" : "+13475457062", "called" : false },
          { "id" : 2, "firstname" : 'Jane', "lastname" : 'Doe', "phone" : "+13475457062", "called" : false },
          { "id" : 3, "firstname" : 'John', "lastname" : 'Doe', "phone" : "+13475457062", "called" : false }
        ]
      },
      {
        "queueId" : 456,
        "name": "Dr. Sophie Aldaba",
        "description" : "Physical Therpist",
        "prefix" : "C",
        "primaryImage" : "http://67.205.165.76:3000/img/doctor_6.jpg",
        "queue" : [
          { "id" : 4, "firstname" : 'Neo', "lastname" : 'Ruiz', "phone" : "+13475457062", "called" : false },
          { "id" : 5, "firstname" : 'Neo', "lastname" : 'Ruiz', "phone" : "+13475457062", "called" : false }
        ]
      },
      {
        "queueId" : 789,
        "name": "Dr. Stewie Griffin",
        "description" : "General Doctor",
        "prefix" : "D",
        "primaryImage" : "http://67.205.165.76:3000/img/doctor_3.jpg",
        "queue" : [
          { "id" : 4, "firstname" : 'Neo', "lastname" : 'Ruiz', "phone" : "+13475457062", "called" : false },
          { "id" : 5, "firstname" : 'Neo', "lastname" : 'Ruiz', "phone" : "+13475457062", "called" : false }
        ]
      },
      {
        "queueId" : 456,
        "name": "default",
        "prefix" : "A",
        "description" : "unsorted queue",
        "queue" : [
          { "id" : 4, "firstname" : 'Neo', "lastname" : 'Ruiz', "phone" : "+13475457062", "called" : false },
          { "id" : 5, "firstname" : 'Neo', "lastname" : 'Ruiz', "phone" : "+13475457062", "called" : false }
        ]
      }
    ];

/* Authentication */
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/queue', function (req, res) {
  res.json({
    data : queue
  });
});


app.post('/sms', function (req, res) {
  var message = "Please send a valid action. send 'skip' to move your postion, 'cancel' to cancel your appointment, 'update' to know you curreny position.";
  var guestFound = false;

  console.log(req.body.Body);
  console.log(req.body.From);

  for (var x = 0; x < queue.length; x++ ){
    for ( var y = 0; y < queue[x].queue.length; y++ ){
      if ( queue[x].queue[y].phone == req.body.From ){
        var guest = queue[x].queue[y];
        guestFound = true;
        if ( actions.indexOf(req.body.Body.toLowerCase()) > -1 ){
          message = "K, fine!";
        }
      }
    }
  }

  if ( !guestFound ){
    message = "Sorry, there is no action available for this phone number. please talk to our frontdesk to confirm your checkin.";
  }

  //req.body.Body
  //req.body.From
  res.set('Content-Type', 'text/xml');
  res.send(o2x({
      '?xml version="1.0" encoding="utf-8"?' : null,
      Response : {
          Message : message
      }
  }));
});

app.post('/queue/:queueId', function (req, res) {
  var guest = {
    "firstname" : req.body.firstname,
    "lastname" : req.body.lastname,
    "phone" : req.body.phone
  };

  console.log(guest);

  for ( var x = 0; x < queue.length; x++ ){
    if ( queue[x].queueId == req.params.queueId){
      var current_queue = queue[x];

      guest.id = current_queue.prefix + (queue[x].queue.length + 1);
      queue[x].queue.push(guest);

      client.messages.create({
        body: 'Hi ' + guest.firstname + ', You have been placed on Queue with the number ' + guest.id + '. please wait for your number to be called.',
        to: '+1' + guest.phone ,  // Text this number
        from: '+13472299963'// From a valid Twilio number
      }, function (err, message) {
        if ( err ) {
          console.log(err);
        } else {
          console.log(message.sid);
        }
      });

      res.json({
        "number" : guest.id
      });
      break;
    }
  }
});

app.post('/notify/:guestId', function (req, res) {
  var guestId = req.params.guestId;

  for (var x = 0; x < queue.length; x++ ){
    for ( var y = 0; y < queue[x].queue.length; y++ ){
      if ( queue[x].queue[y].id == guestId ){
        var guest = queue[x].queue[y];

        client.messages.create({
          body: 'Hi ' + guest.firstname + ", Your doctor at Hudson Medical Plaza is almost ready to see you, please make yourself available in the lobby within 5 minutes. Thank you!" ,
          to: guest.phone,  // Text this number
          from: '+13472299963' // From a valid Twilio number
        }, function (err, message) {
          console.log(message.sid);
        });
      }
    }
  }
});

app.get('/queue/:queueId', function(req, res){
  var queueFound = false;
  
  for ( var x = 0; x < queue.length; x++ ){
    if ( queue[x].queueId == req.params.queueId){
      res.json(queue[x]);
      queueFound = true;
      break;
    }
  }

  if ( !queueFound ){
    res.json({ "error" : "Invalid Queue ID" });
  }
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})