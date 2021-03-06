const express = require('express');
const app = express();
const router = express.Router();
const db = require('../db/models');
const bodyParser = require('body-parser');

let User = db.User;

router.use(bodyParser.urlencoded({ extended: false}))

// for sessions:
// when user is authenticated at /login, req.session.sessionId cookie is set.
// home.ejs template will get a boolean set in the render method.
// home.ejs will inject a script tag that will set values to be used in bundle.js
// letting front end determine if user is logged in or not

// return the homepage
router.get('/', (req, res) => {
    if(req.session.sessionId && req.session.sessionEmail && req.session.score){
      res.render('home', {
        loggedIn: true,
        sessionEmail: `${req.session.sessionEmail}`,
        sessionScore: req.session.score
      });
    } else {
      res.render('home', {loggedIn: false});
    }
});

router.post('/register', bodyParser.json(), (req, res, next) => {

  // create a user document then initialize user info for the session and pass it to front end
  if(req.body.email && req.body.password){
    let userToAdd = new User ({
      email: req.body.email,
      password: req.body.password
    });
    userToAdd.save(function(error, user){
      if(error){
        return next(error);
      } else {
        req.session.sessionId = user._id;
        req.session.sessionEmail = user.email;
        req.session.score = {
          accuracy: 0,
          attempts: 0,
          correct: 0
        };
        return res.json({
          sessionId: req.session.sessionId,
          email: req.session.sessionEmail,
          score: req.session.score
        });
      }
    })
  } else {
    let err = new Error('all fields required!!!!');
    err.status = 400;
    return next(err);
  }
});

// authenticate user and set user info in session variables
router.put('/login', bodyParser.json(), (req, res, next) => {
  if(req.body.email && req.body.password){
    User.authenticate(req.body.email, req.body.password, function(error, user){
      if(error || !user){
        var err = new Error('wrong email or password');
        err.status = 401;
        return next(err);
      } else {
        req.session.sessionId = user._id;
        req.session.sessionEmail = user.email;
        req.session.score = {
          accuracy: user.accuracy,
          attempts: user.attempts,
          correct: user.correct
        };
        return res.json({
          sessionId: req.session.sessionId,
          email: req.session.sessionEmail,
          score: req.session.score
        });
      }
    });
  } else {
    var err = new Error('Email and password are required');
    err.status = 401;
    return next(err);
  }
})

// destroy session and set logout for front end
router.put('/logout', (req, res, next) =>{
  req.session.destroy((err) => {
    if(err){
      return next(err)
    } else {
      res.json({
        loggedIn: false
      })
    }
  })
});

// update the user's score stats
router.put('/accuracyUpdate', bodyParser.json(), (req, res, next) => {
  let updatedScore = {
    accuracy: req.body.accuracy,
    attempts: req.body.attempts,
    correct: req.body.correct
  }
  User.findOneAndUpdate({email: req.body.email}, {$set: updatedScore}, {new: true}, function(err, user){
    if(err){
      return next(err);
    } else {
      req.session.score = {
        accuracy: user.accuracy,
        attempts: user.attempts,
        correct: user.correct
      };
      res.json(user);
    }
  })
})

// admin routes
router.get('/admin', (req, res) => {
      res.render('admin/admin');
});


module.exports = router;
