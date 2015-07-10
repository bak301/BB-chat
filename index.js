/**
 * Created by bak on 09/07/2015.
 */
var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var database = require('mongodb').MongoClient
var chatDB = 'mongodb://localhost:8099/chat'
var userList=[{online:0}];
var Online = userList[0].online;
var usrNumber = 1;

// BEGIN SERVE PROCESS
app.use(express.static(__dirname+'/html'))// Send to client the HTML page

io.on('connection', function (socket) { // When client establish a connection
    Online++;
    console.log('An user connected!: ' + socket.id)
    console.log('Number of user online: '+Online)
    database.connect(chatDB,function(er,db){
        if (er){ // Start handling event
            console.log("error: "+er)
            io.emit('failed database','Failed to connect to database. You can keep chatting but no chat log will be recorded.')
            socket.event(false)
        } else {
            socket.event(true,db)
        }

        if (Online == 0){
            db.close()
        }
    })
    // -------------------------------DEFINE FUNCTION
    socket.event = function(isDBconnected,db){
        socket.on('disconnect', function () {
            console.log('An user disconnected!: ' + socket.id)
            console.log('Number of user online: '+Online)
            db.collection('user').findOneAndUpdate({usrId:socket.id},{$set:{isOnline:false}})
            Online--
        })

        socket.on('add user', function (name) {// When someone register his/her name
            db.addUser(isDBconnected,socket.id, name,db)
            userList[usrNumber] = {
                "usrId": socket.id,
                "usrName": name
            };
            usrNumber++;
            console.log("new user: " + name)
        })

        socket.on('new mess', function (mess) { // When a new message sent
            for (var i in userList) { // Check the user list to find out who send the message
                if (userList[i].usrId && userList[i].usrId == socket.id) {
                    var name = userList[i].usrName
                    console.log('New mess from ' + name + ': ' + mess)
                    io.emit('new mess', '<span class="name">' + name + '</span>' + ": " + mess)// Send to the client that message with sender
                    db.addConversation(isDBconnected,name, mess,db)// Add conversation to chat log
                }
            }
        })
    }
})
// Server start listening
server.listen(3001, function () {
    console.log('Listen on port 3001!')
})

// -----------------------------------------DEFINE FUNCTION
function getDateTime() {
    var now     = new Date();
    var year    = now.getFullYear();
    var month   = now.getMonth()+1;
    var day     = now.getDate();
    var hour    = now.getHours();
    var minute  = now.getMinutes();
    var second  = now.getSeconds();
    if(month.toString().length == 1) month = '0'+month;
    if(day.toString().length == 1) day = '0'+day;
    if(hour.toString().length == 1) hour = '0'+hour;
    if(minute.toString().length == 1) minute = '0'+minute;
    if(second.toString().length == 1) second = '0'+second;
    var dateTime = year+'/'+month+'/'+day+' '+hour+':'+minute+':'+second;
    return dateTime;
}

database.addConversation = function (code,name,mess,db){
    if (code == true){
        var log = db.collection('log')
        log.insertOne({
            from:name,
            time: getDateTime(),
            content: mess
        })
    }
}

database.addUser = function (code,id,name,db){
    if (code == true){
        var usrList = db.collection('user')
        usrList.insertOne({
            "usrName": name,
            "isOnline":true,
            "usrId":id,
            "lastTimeConnect": getDateTime()
        })
    }
}