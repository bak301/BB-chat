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
        if (er){ // Error when connect to database
            console.log("error: "+ er)
            io.emit('failed database','Failed to connect to database. You can keep chatting but no chat log will be recorded.')
            eventHandle(false)
        } else {
            console.log('Connect to chat database !')
            eventHandle(true,db) // Standard event handler
        }
        // ---------------------------DEFINE FUNCTION
        db.addConversation = function (name,mess){
            db.collection('log').insertOne({
                from: name,
                time: getDateTime(),
                content: mess
            })
        }

        db.addUser = function (id,name){
            db.collection('user').insertOne({
                usrName: name,
                isOnline: true,
                usrId: id,
                lastTimeConnect: getDateTime()
            })
        }

        db.setOffline = function (id){
            db.collection('user').findOneAndUpdate({usrId:id},{$set:{isOnline:false}},function(er,data){
                if (er) console.log("Can't find !")
                else if (data.usrName) console.log('User '+data.usrName+' has disconnected !')
                else console.log('Anonymous has disconnected')
                Online--;
                if (Online == 0){
                    console.log('database closed due to no one connect !')
                    db.close() // Close database connection when no one come :(
                }
            })
        }
    })

    // -------------------------------DEFINE FUNCTION
    function eventHandle(connectStatus,db){
        socket.on('disconnect', function () {
            console.log('An user disconnected!: ' + socket.id)
            isDBconnected(connectStatus,function(){
                db.setOffline(socket.id)
            })
        })

        socket.on('add user', function (name) {// When someone register his/her name
            isDBconnected(connectStatus,function(){
                db.addUser(socket.id, name)
            })
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
                    io.emit('new mess',{
                        user:name,
                        content:mess
                    })// Send to the client that message with sender

                    isDBconnected(connectStatus,function(){
                        db.addConversation(name, mess)
                    })// Add conversation to chat log
                }
            }
        })
    }
})
// Server start listening
server.listen(3001, function () {
    console.log('Listen on port 3001!')
})

// -----------------------------------------DEFINE GLOBAL FUNCTION
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

function isDBconnected (state,cb){
    if (state == true){
        cb()
    }
}