var http = require('http')
var options = {
	hostname: 'localhost',
	port: 3001,
	path: '/',
	method: 'GET',
	headers: {
		'Content-Type': 'application/x-www-form-urlencoded',
		'Content-Length': 100
	}
};
var req = http.request(options, function(res) {
	res.setEncoding('utf8');
});
// write data to request body
req.write(process.argv[2]);
req.end()