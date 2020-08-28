const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors')

var mongo = require('mongodb');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

const {ObjectId} = require('mongodb');

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

var workoutSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date
});

var Workout = mongoose.model("Workout", workoutSchema);

var userSchema = new mongoose.Schema({
  username: String,
  workouts: [
    {description: String,
    duration: Number,
    date: Date}
  ]
});

var User = mongoose.model("User", userSchema);

app.post("/api/exercise/new-user", (req, res) => {
  //code
  let username = req.body.username;
  User.findOne({username: username}, (err, data) => {
    if (err) {return console.error(err);}
    else {
      if (data !== null) {
        res.json("Username already taken");
      } else {
        let newUser = new User({username: username, exercise: []});
        newUser.save((err, updatedUser) => {
          if (err) {return console.error(err);}
          else {
            res.json({"username": username, "_id": newUser._id});
          }
        });
      }
    }
  });
});

app.post("/api/exercise/add", (req, res) => {
  let userid = req.body.userId;
  let descript = req.body.description;
  let time = Number(req.body.duration);
  let date;
  if (req.body.date !== '') {
    date = new Date(req.body.date);
  } else {
    date = new Date(Date.now());
  }
  
  if (descript == '' || time == '' || userid == '') {
    res.json({"error": "invalid fields"});
  } else {
    /*let myWorkout = {
      username,
      description: descript,
      duration: time,
      date: date,
      _id
    };*/
    User.findOne({_id: userid}, (err, data) => {
      if (err) {return console.error(err);}
      else if (data !== null) {
        let myWorkout = {
          username: data.username,
          description: descript,
          duration: time,
          //_id: userid,
          date: date.toDateString()
        }
        //let newWorkout = new Workout({username: data.username, description: descript, duration: time, date: date, _id: data._id});
        //newWorkout.save((err) => {if (err) return console.error(err)});
        data.workouts = data.workouts.concat(myWorkout);
        data.workouts = data.workouts.sort((a, b) => a.date - b.date);
        data.save((err) => {if (err) return console.error(err)});
        res.json({username: myWorkout.username, description: myWorkout.description, duration: myWorkout.duration, _id: data._id, date: myWorkout.date});
        //res.json(myWorkout);
      } else {
        res.json({"error": "create valid user first"});
      }
    });
  }
});

//5f482f8ea3a36c0abd3c7dcd
//5f48316d35884b10d4aabdbe little elephant
//5f49916ad6b8b80177e82241 Anna

app.get("/api/exercise/users", (req, res) => {
  //code
  User.find({}, (err, data) => {
    if (err) {return console.error(err);}
    else if (data !== null) {
      res.json(data);
    } else {
      res.json({"error": "no known users"});
    }
  });
});

app.get("/api/exercise/log", (req, res) => {
  //code
  let userid = req.query.userId;
  let from = new Date(req.query.from);
  let to = new Date(req.query.to);
  let limit = Number(req.query.limit);
  
  User.findOne({_id: userid}, (err, data) => {
    if (err) {return console.error(err);}
    else if (data !== null) {
      let arr = data.workouts;
      
      if (!isNaN(to.getTime()) && !isNaN(from.getTime())) {
        arr = arr.filter((item) => ((item.date <= to) && (item.date >= from)));
      }
      
      if (!isNaN(limit)) {
        arr = arr.slice(0, limit);
      }
      
      let count = arr.length;
      
      res.send({"log": arr, count: count});
      
    } else {
      res.json({"error": "cannot retrieve workout"});
    }
  })
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'});
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt')
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
