/**
 * Created by bak on 09/07/2015.
 */
var koa = require('koa')
var serve = require('koa-static')
var app = koa()
// BEGIN SERVE PROCESS
app.use(serve(__dirname+'/html'))// Send to client the HTML page

var server = require('http').Server(app.callback())
var io = require('socket.io')(server)
var userList=[{online:0}];
var Online = userList[0].online;
var usrNumber = 1;

var database = require('mongodb').MongoClient
var chatDB = 'mongodb://localhost:8099/chat'

database.connect(chatDB,function(er,db){
    if (er){ // Error when connect to database
        console.log("error: "+ er)
        io.emit('failed database')
        main(false)
    } else {
        console.log('Connect to chat database !')
        main(true,db) // Standard event handler
    }

    function main(dbStatus,db){
        io.on('connection', function (socket) { // When client establish a connection
            Online++;
            console.log('An user connected!: ' + socket.id)
            console.log('Number of user online: '+Online)

            // -------------------------------DEFINE FUNCTION
            socket.on('disconnect', function () {// When someone disconnect
                console.log('An user disconnected!: ' + getUserName(socket.id))
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

            socket.on('stop typing',function(){// When someone stop typing
                console.log('User '+getUserName(socket.id)+' stop typing')
                io.emit('stop typing')
            })

            socket.on('new mess', function (mess) { // When a new message sent
                var username = getUserName(socket.id)
                isDBconnected(dbStatus,function(){
                    db.addConversation(username, mess)
                    db.getEmoticons(mess,function(data){
                        io.emit('new mess',{
                            user:username,
                            content:mess,
                            emo: data
                        })// Send to the client that message with sender and emoticons
                    })
                },function(){
                    io.emit('new mess',{
                        user:username,
                        content:mess
                    })// Send to the client that message with sender
                })// Add conversation to chat log
            })

            // ------------------------------- DEFINE FUNCTION FOR DATABASE INTERACTION
            function getUserName(id){
                for (var i in userList){
                    if (userList[i].usrId === id){
                        return userList[i].usrName
                    }
                }
            }

            function isDBconnected (state){
                if (state == true){
                    arguments[1]()
                } else if (arguments[2]){
                    arguments[2]()
                }
            }

            isDBconnected(dbStatus,function(){
                db.getEmoticons = function(mess,cb){ // Get emoticons from the database
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

                db.addConversation = function (name,mess){ // add conversation to chatlog in the database
                    db.collection('log').insertOne({
                        from: name,
                        time: getDateTime(),
                        content: mess
                    })
                }

                db.addUser = function (id,name){ // add an user
                    db.collection('user').insertOne({
                        usrName: name,
                        isOnline: true,
                        usrId: id,
                        lastTimeConnect: getDateTime()
                    })
                }

                db.setOffline = function (id){ // Set offline status
                    db.collection('user').findOneAndUpdate({usrId:id},{$set:{isOnline:false}},function(er,data){
                        if (er) console.log("Can't find !")
                        else if (data.usrName) console.log('User '+data.usrName+' has disconnected !')
                        else console.log('Anonymous has disconnected')
                        Online--;
                    })
                }

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
            })
        })
    }
})

// Server start listening
server.listen(3001, function () {
    console.log('Listen on port 3001!')
})