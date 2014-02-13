var express = require('express');
var exec = require('child_process').exec;

module.exports = function (opts) {
	opts = opts || {};

	//Optional
	var port = opts.port || 8888;
	var route = opts.route || "/";
	var local = opts.local || "./";
	var user = opts.user || "";
	var pass = opts.pass || "";

	//Private
	var refs = {};


	this.app = express();	
	if(user && pass) this.app.use(express.basicAuth(user, pass));
	this.app.use(express.bodyParser());

	this.app.post(route, requestHandler.bind(this));
	this.hook = hook.bind(this);
	this.pull = pull.bind(this);
	this.app.listen(port);

	function requestHandler (req, res, next) {
		res.send(200);

		//rando Github pings-- ignore them
		if(req.body.zen) {
			return;
		}

		var payload = req.body.payload;

		if(!payload) {
			console.log("Recieved body w/o payload: ", req.body);
			return;
		}

		var fullRef = payload.ref;
		var shortRef = fullRef.split('refs/heads/')[1];
		var action = refs[fullRef] || refs[shortRef];

		if(action) {
			action(payload);
		}
	};

	function hook (branch, action) {
		if(refs[branch] !== undefined) {
			console.warn("Overwriting hook for " + branch);
		}
		refs[branch] = action.bind(this);
	};

	function pull (branch, callback) {
		var stdout = "", stderr = "";
		var git = spawn("git", ["pull", "origin", branch, "--ff-only"], {
			cwd: local
		});

		git.stderr.on("data", function (data) {
			stderr += data.toString();
		});

		git.stdout.on("data", function (data) {
			stdout += data.toString();
		});

		git.on("close", function(code) {
			if (code != 0) {
				callback(new Error("Git exited with status code " + code + ": " + stderr));
			}
			else {
				callback(null, stdout);
			}
		});
	};
};



