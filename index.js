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
    })

    // -------------------------------DEFINE FUNCTION
    function eventHandle(dbStatus,db){
        socket.on('disconnect', function () {
            console.log('An user disconnected!: ' + socket.id)
            isDBconnected(dbStatus,function(){
                db.setOffline(socket.id)
            })
        })

        socket.on('add user', function (name) {// When someone register his/her name
            isDBconnected(dbStatus,function(){
                db.addUser(socket.id, name)
            })
            userList[usrNumber] = {
                "usrId": socket.id,
                "usrName": name
            };
            usrNumber++;
            console.log("new user: " + name)
        })

        socket.on('typing',function(){// When someone is typing
            socket.broadcast.emit('typing',getUserName(socket.id))
        })

        socket.on('stop typing',function(){
            console.log('User '+getUserName(socket.id)+'stop typing')
            io.emit('stop typing',getUserName(socket.id))
        })

        socket.on('new mess', function (mess) { // When a new message sent
            var name = getUserName(socket.id)
            isDBconnected(dbStatus,function(){
                db.addConversation(name, mess)
                db.returnEmoticons(mess,function(data){
                    io.emit('new mess',{
                        user:name,
                        content:mess,
                        emo: data
                    })// Send to the client that message with sender
                })
            },function(){
                io.emit('new mess',{
                    user:name,
                    content:mess
                })// Send to the client that message with sender
            })// Add conversation to chat log
        })

        // DEFINE FUNCTION FOR DATABASE INTERACTION
        function getUserName(id){
            for (var i in userList){
                if (userList[i].usrId && userList[i].usrId == id){
                    return userList[i].usrName
                }
            }
        }

        isDBconnected(dbStatus,function(){
            db.returnEmoticons = function(mess,cb){
                db.collection('emo').find({}).toArray(function(er,docs){
                    var emoObj = {}
                    for (var i in docs){
                        if(mess.indexOf(docs[i].shortcut) !== -1){
                            emoObj[docs[i].shortcut] = docs[i].src
                        }
                    }
                    cb(emoObj)
                })
            }

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

function isDBconnected (state,cb,cb2){
    if (state == true){
        cb()
    } else {
        cb2()
    }
}