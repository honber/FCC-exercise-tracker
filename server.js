'use strict'

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI)

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


let Schema = mongoose.Schema;
let usersSchema = new Schema({
  username: String,
  exercises: []
})
let usersModel = mongoose.model('Users', usersSchema);


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//functions
function formatDate(date){
  return date.split(' ').slice(0, 4).join(' ');
}

function returnLogFromStatedDate(record, date){
  let recordWithFilteredLog = record;
  recordWithFilteredLog.exercises = recordWithFilteredLog.exercises.filter((element)=>{
    return element && (new Date(element.date) >= new Date(date))
    })
    .sort((prev, next) =>{
      return new Date(prev.date) - new Date(next.date)
    })
  console.dir(recordWithFilteredLog);
  return recordWithFilteredLog;
}

function returnLogFromStatedDateToStatedDate(record, dateFrom, dateTo){
  let recordWithFilteredLog = record;
  recordWithFilteredLog.exercises = recordWithFilteredLog.exercises.filter((element)=>{
    return element && (new Date(element.date) >= new Date(dateFrom)) && (new Date(element.date) <= new Date(dateTo))
    })
    .sort((prev, next) =>{
      return new Date(prev.date) - new Date(next.date)
    })
  console.dir(recordWithFilteredLog);
  return recordWithFilteredLog;
}

function returnLogFromStatedDateToStatedDateWithLimit(record, dateFrom, dateTo, limit){
  let recordWithFilteredLog = record;
  recordWithFilteredLog.exercises = recordWithFilteredLog.exercises.filter((element)=>{
    return element && (new Date(element.date) >= new Date(dateFrom)) && (new Date(element.date) <= new Date(dateTo))
    })
    .sort((prev, next) =>{
      return new Date(prev.date) - new Date(next.date)
    })
    .slice(0, limit)
  console.dir(recordWithFilteredLog);
  return recordWithFilteredLog;
}


//save new user in DB
app.post('/api/exercise/new-user', function(req, res){
  usersModel.find({username: req.body.username}, function(error, response){
    if(error){
      return error
    }
    else{
      return response
    }
  })
  .then(function(userFoundInDB){
    if(userFoundInDB.length !== 0){
      res.send('username already taken')
    }
    else{
      let newUser = new usersModel({username: req.body.username})  
      newUser.save(function(error, response){
        if(error){
          return error
        }
        else{
          res.json({
            "_id": newUser._id,
            "username": newUser.username,
            "_v": newUser._v
          });
        }
      })   
    }
  })  
});

app.get('/api/exercise/users', function(req, res){
  usersModel.find({}, '-exercises', function(error, response){
    if(error){
      res.send(error)
    }
    else{
      res.json(response)
    }
  })
})

//save new exercise in DB for user with given Id
app.post('/api/exercise/add', function(req, res){
  if(req.body.userId === ''){
    res.send('unknown _id')
  }
  if(req.body.description === ''){
    res.send('Path `description` is required.')
  }
  if(req.body.duration === ''){
    res.send('Path `duration` is required.')
  }
  if(isNaN(req.body.duration)){
    res.send('Type of `duration` must be a number.')
  }
  if(req.body.date !== '' && (new Date(req.body.date).toString() === 'Invalid Date')){
    res.send('Invalid date format.')
  }
  
  else{
    usersModel.findById(req.body.userId, function(error, response){
      if(error){
        return error;
      }
      else{
        return response
      }     
    })
    .then(function(data){
      let userRecord = data;
      req.body.date === '' ? new Date().toString() : new Date(req.body.date).toString()
      userRecord.exercises.push({
        "description": req.body.description, 
        "duration": req.body.duration, 
        "date": req.body.date === '' ? formatDate(new Date().toString()) : formatDate(new Date(req.body.date).toString())
      })
     return userRecord
    })
    .then(function(record){
      usersModel.findByIdAndUpdate(record._id, {exercises: record.exercises}, function(error, response){
        if (error){
          return error
        }
        else{
          res.json({
            "username": response.username,
            "description": record.exercises[record.exercises.length-1].description,
            "duration": record.exercises[record.exercises.length-1].duration,
            "_id": record._id,
            "date": record.exercises[record.exercises.length-1].date
          })
        }
      })
    })
    .catch(function(error){
      res.send(error)
    })
  }
})


//getting an exercise log from DB
app.get('/api/exercise/log', function(req, res){
  if(!req.query.userId){
    res.send('unknown userId')
  }
  else if(req.query.userId && !req.query.from){
    usersModel.findById(req.query.userId)
    .exec()
    .then((data)=>{
      res.json(data)
    })
    .catch((error) => {
      res.send(error);
    }) 
  }
  else if(req.query.userId && req.query.from && !req.query.to){
    usersModel.findById(req.query.userId)
    .exec()
    .then((data)=>{
      res.json(returnLogFromStatedDate(data, req.query.from))
    })
    .catch((error) => {
      res.send(error);
    }) 
  }
  else if (req.query.userId && req.query.from && req.query.to && !req.query.limit){
    usersModel.findById(req.query.userId)
    .exec()
    .then((data)=>{
      res.json(returnLogFromStatedDateToStatedDate(data, req.query.from, req.query.to))
    })
    .catch((error) => {
      res.send(error);
    })   
  }
  else{
    usersModel.findById(req.query.userId)
    .exec()
    .then((data)=>{
      res.json(returnLogFromStatedDateToStatedDateWithLimit(data, req.query.from, req.query.to, req.query.limit))
    })
    .catch((error) => {
      res.send(error);
    })   
  }
})



app.get('/find', function(req, res){
  usersModel.find({}, function(err, response){
    if(err){
      res.send(err)
    }
    else{
      res.json(response)
    }
  })
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
