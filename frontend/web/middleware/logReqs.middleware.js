const fs = require('fs');
module.exports  = (req,res,next)=>{
	let content = `[${(new Date()).toISOString()}] ${req.ip} ${req.url} ${req.method}`; //req.socket.remoteAddress
	//console.log(!Boolean(process.env.SILENTLOG));
	if(!parseInt(process.env.SILENTLOG ?? 0)){
		console.log(content);
	};
	fs.appendFile('./mlogs/requests.log', content+"\n", err => {
		if (err) {
			console.error("Request Write Error: "+err);
		}
	});
	next();
}