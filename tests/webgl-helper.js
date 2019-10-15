
/**
 * @desc Create a logger for console messages and timing
 * @param {boolean} inp.logging - do we log messages to the console?
 * @param {boolean} inp.logtime - do we want to log execution times?
 * @param {string} inp.id - an ID to use for the log messages (default "JS")
 */
function Logger(inp){
	if(!inp) inp = {};
	this.logging = (inp.logging||false);
	this.logtime = (inp.logtime||false);
	this.id = (inp.id||"JS");
	this.metrics = {};
	this.error = function(){ this.log('ERROR',arguments); };
	this.warning = function(){ this.log('WARNING',arguments); };
	this.info = function(){ this.log('INFO',arguments); };
	this.message = function(){ this.log('MESSAGE',arguments); };
	return this;
}

/**
 * @desc A wrapper for log messages. The first argument is the type of message e.g. "ERROR", "WARNING", "INFO", or "MESSAGE". Other arguments are any objects/values you want to include.
 */
Logger.prototype.log = function(){
	if(this.logging || arguments[0]=="ERROR" || arguments[0]=="WARNING" || arguments[0]=="INFO"){
		var args,args2,bold;
		args = Array.prototype.slice.call(arguments[1], 0);
		args2 = (args.length > 1 ? args.splice(1):"");
		// Remove array if only 1 element
		if(args2.length == 1) args2 = args2[0];
		bold = 'font-weight:bold;';
		if(console && typeof console.log==="function"){
			if(arguments[0] == "ERROR") console.error('%c'+this.id+'%c: '+args[0],bold,'',args2);
			else if(arguments[0] == "WARNING") console.warn('%c'+this.id+'%c: '+args[0],bold,'',args2);
			else if(arguments[0] == "INFO") console.info('%c'+this.id+'%c: '+args[0],bold,'',args2);
			else console.log('%c'+this.id+'%c: '+args[0],bold,'',args2);
		}
	}
	return this;
};

/**
 * @desc Start/stop a timer. This will build metrics for the key containing the start time ("start"), weighted average ("av"), and recent durations ("times")
 * @param {string} key - the key for this timer
 */
Logger.prototype.time = function(key){
	if(!this.metrics[key]) this.metrics[key] = {'times':[],'start':''};
	if(!this.metrics[key].start) this.metrics[key].start = new Date();
	else{
		var t,w,v,tot,l,i,ts;
		t = ((new Date())-this.metrics[key].start);
		ts = this.metrics[key].times;
		// Define the weights for each time in the array
		w = [1,0.75,0.55,0.4,0.28,0.18,0.1,0.05,0.002];
		// Add this time to the start of the array
		ts.unshift(t);
		// Remove old times from the end
		if(ts.length > w.length-1) ts = ts.slice(0,w.length);
		// Work out the weighted average
		l = ts.length;
		this.metrics[key].av = 0;
		if(l > 0){
			for(i = 0, v = 0, tot = 0 ; i < l ; i++){
				v += ts[i]*w[i];
				tot += w[i];
			}
			this.metrics[key].av = v/tot;
		}
		this.metrics[key].times = ts.splice(0);
		if(this.logtime) this.info(key+' '+t+'ms ('+this.metrics[key].av.toFixed(1)+'ms av)');
		delete this.metrics[key].start;
	}
	return this;
};
