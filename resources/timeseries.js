/*
	AAS Time Series graphing library.
	Written by Stuart Lowe
	
	INCLUDES:
	* Fix for setTimeout in IE - http://webreflection.blogspot.com/2007/06/simple-settimeout-setinterval-extra.html
	* Full screen API - http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
	
	USAGE:
		<html>
		<head>
			<script src="stuquery.js" type="text/javascript"></script>
			<script src="graph.js" type="text/javascript"></script>
			<script src="timeseries.js" type="text/javascript"></script>
			<script type="text/javascript">
			</script>
		</head>
		<body>
			<div id="lightcurve" style="width:100%;height:350px;font-size:0.8em;font-family:Century Gothic,sans-serif;"></div>
		</body>
		</html>
*/

(function(root){

	// First we will include all the useful helper functions
	// Get the current Julian Date
	function getJD(today) {
		// The Julian Date of the Unix Time epoch is 2440587.5
		if(!today) today = new Date();
		return ( today.getTime() / 86400000.0 ) + 2440587.5;
	}

	// A non-jQuery dependent function to get a style
	function getStyle(el, styleProp) {
		if (typeof root === 'undefined') return;
		var style;
		var el = document.getElementById(el);
		if (el.currentStyle) style = el.currentStyle[styleProp];
		else if (root.getComputedStyle) style = document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
		if (style && style.length === 0) style = null;
		return style;
	}
	// End of helper functions

	// Base directory for timeseries.js
	var basedir = "";

	TimeSeries = new function(){
		this.version = "0.0.6";
		this.create = function(json,opt){ return new TS(json,opt); }
		this.load = { 'resources': {'files':{},'callbacks':[]}, 'data': {'files':{},'callbacks':[]} }
		this.callback = "";
		this.logging = false;
		
		// Work out the file path to the code for other resources
		var scripts = document.getElementsByTagName('script');
		var path = scripts[scripts.length-1].src.split('?')[0];
		var idx = path.lastIndexOf("/");
		basedir = (idx >= 0) ? path.substr(0,idx+1) : "";

		var _obj = this;
		
		this.log = function(){
			if(this.logging){
				var args = Array.prototype.slice.call(arguments, 0);
				if(console && typeof console.log==="function") console.log('TimeSeries',args);
			}
			return this;
		}

		/* Have we loaded all the data files necessary? */
		this.filesLoaded = function(fs){
			this.log('filesLoaded',fs,this.load.data)
			var n = 0;
			for(var d = 0; d < fs.length; d++){
				if(this.load.data.files[fs[d]] && this.load.data.files[fs[d]].loaded) n++;
			}
			return (n==fs.length);
		}

		this.loadFromDataFile = function(f,attr,fn){
		
			this.log('loadFromDataFile',f,attr,fn);
			
			attr.file = f;
			
			if(!this.load.data.files[f]){
				this.load.data.files[f] = {'loaded':false,'callbacks':[]};
				this.load.data.files[f].callbacks.push({'fn':fn,'attr':attr});

				this.log('loading data',f)
				// Now grab the data
				S().ajax(f,{
					"dataType": "csv",
					"this": this,
					"file": f,
					"success": function(d,attr){
						// Remove extra newlines at the end
						d = d.replace(/[\n\r]$/,"");

						var cb = this.load.data.files[attr.file].callbacks;
						this.log('CALLBACKS',attr.file,cb);
						for(var i = 0; i < cb.length; i++){
							// Set original context dataset data
							this.load.data.files[cb[i].attr.file].data = d;
							this.load.data.files[cb[i].attr.file].loaded = true;
							this.log('DATA ',cb[i].attr.dataset.name,this.load.data.files[cb[i].attr.file])

							if(typeof cb[i].fn==="function") cb[i].fn.call(cb[i].attr['this'],this.load.data.files[cb[i].attr.file].data,cb[i].attr);
						}
					}
				});
			}else{
				if(!this.load.data.files[f].loaded){
					// Add the callback to the queue
					this.load.data.files[f].callbacks.push({'fn':fn,'attr':attr});
				}else{
					// Apply the callback if we've already loaded the data file
					if(typeof fn==="function") fn.call(attr['this'],this.load.data.files[f].data,attr);
				}
			}
		}
		this.loadResources = function(files,attr,callback){

			this.log('loadResources',files)
			// Load any necessary extra js/css for clustering
			if(typeof files==="string") files = [files];
			
			// Store the callback for when we've loaded everything
			this.load.resources.callbacks.push({'callback':callback,'attr':attr});
		
		
			function checkAndGo(files,t){
				var got = 0;
				for(var f = 0; f < files.length; f++){
					if(TimeSeries.load[t].files[files[f]].loaded) got++;
				}
				_obj.log('checkAndGo',got,files.length,TimeSeries.load[t].callbacks);
				if(got==files.length){
					for(var c = TimeSeries.load[t].callbacks.length-1; c >= 0; c--){
						_obj.log('Processing callback '+c+' for '+t,TimeSeries.load[t].callbacks)
						TimeSeries.load[t].callbacks[c].callback.call((TimeSeries.load[t].callbacks[c].attr['this'] || TimeSeries),{'data':TimeSeries.load[t].callbacks[c].attr});
						// Remove the callback
						TimeSeries.load[t].callbacks.pop();
					}
				}
			}

			for(var i = 0; i < files.length; i++){
				if(!_obj.load.resources.files[files[i]]){
					_obj.log('loading resource',files[i])

					_obj.log('start loading '+files[i]+' is ',_obj.load.resources.files[files[i]]);
					_obj.load.resources.files[files[i]] = {'loaded':false};

					_obj.loadCode(files[i],function(e){
						_obj.load.resources.files[e.url].loaded = true;
						_obj.log('loaded resource '+e.url);
						checkAndGo(files,"resources");
					})
				}else{
					_obj.log('current state of '+files[i]+' is ',_obj.load.resources.files[files[i]]);
				}
			}

			return _obj;
		}

		this.loadCode = function(url,callback){
			var el;
			this.log('loadCode',url,callback);
			if(url.indexOf(".js")>= 0){
				el = document.createElement("script");
				el.setAttribute('type',"text/javascript");
				el.src = url;
			}else if(url.indexOf(".css")>= 0){
				el = document.createElement("style");
				el.setAttribute('rel','stylesheet');
				el.setAttribute('type','text/css');
				el.setAttribute('href',url);
			}
			if(el){
				el.onload = function(){ callback.call(_obj,{'url':url}); };
				document.getElementsByTagName('head')[0].appendChild(el);
			}
			return _obj;
		}
		return this;
	}

	function TS(json,opt){
		if(!opt) opt = {};
		this.attr = opt;
		if(typeof json==="object") this.json = json;
		else if(typeof json==="string") this.file = json;
		this.logging = opt.logging || false;
		if(typeof opt.showaswego==="undefined") opt.showaswego = false;

		this.log('TS',json)

		// Set some defaults
		this.options = {
			xaxis: { 'title':'Time', log: false, fit:true },
			yaxis: { 'title': 'y-axis', log: false },
			grid: { hoverable: true, clickable: true, 'color': '#888888' },
			labels: { 'color': '#000000' },
			fit: false,
			tooltip: {'theme':'aas-theme'},
			showaswego: opt.showaswego
		}
		this.datasets = [];
		this.directory = "";
		for(var o in opt){
			if(o=="directory") this[o] = opt[o];
			if(o=="fit") this.options[o] = opt[o];
			if(o=="tooltip") this.options[o] = opt[o];	// https://github.com/vega/vega-tooltip/blob/master/docs/customizing_your_tooltip.md
		}
		if(this.json) this.processJSON(json);

		return this;
	}
	TS.prototype.log = function(){
		if(this.logging){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && typeof console.log==="function") console.log('TS',args);
		}
		return this;
	}
	TS.prototype.processJSON = function(d){
		this.json = d;
		this.log('processJSON',d,this.json)
		if(d.width) this.options.width = d.width;
		if(d.height) this.options.height = d.height;
		if(d.padding) this.options.padding = d.padding;
		
		// Work out axes
		if(d.axes){
			for(var a = 0; a < d.axes.length; a++){
				var dim = "";
				if(d.axes[a].orient=="bottom") dim = "xaxis";
				if(d.axes[a].orient=="left") dim = "yaxis";
				if(dim) for(var p in d.axes[a]) this.options[dim][p] = d.axes[a][p];
			}
		}
		
		this.options.logging = true;
		return this;
	}
	TS.prototype.postProcess = function(){

		this.log('postProcess',this)

		// Over-ride the width/height if we are supposed to fit
		if(this.options.fit){
			this.options.width = this.initializedValues.w;
			this.options.height = this.initializedValues.h;
		}
		this.options.logging = this.logging;
		this.options.xaxis.mode = 'time';
		this.options.scrollWheelZoom = true;

		this.graph = new Graph(this.el, [], this.options) // Need to make this target the correct element
		this.graph.canvas.container.append('<div class="loader"><div class="spinner"><div class="rect1 seasonal"></div><div class="rect2 seasonal"></div><div class="rect3 seasonal"></div><div class="rect4 seasonal"></div><div class="rect5 seasonal"></div></div></div>');

		if(this.json) this.loadDatasets(this.json.data);

		// Attach Hammer events
		S('.msg').html((typeof Hammer!=="undefined" ? "Got it":"Not loaded"));
		if(typeof Hammer!=="undefined"){
			Hammer.on(this.graph.c, "pan", function(ev) {
				S('.msg').html('panning '+ev.type).css({'display':'block'});
			});
		}

		return this;
	}
	/*
		Render a TimeSeries from an HTML element 
		We look for attributes vega-src and vega-scale
	*/
	TS.prototype.initialize = function(e,callback){

		this.log('initialize',e)

		// Store the callback function
		if(typeof callback==="function") this.callback = callback;

		if(!e) console.log('ERROR',e,callback)

		var el = S(e);
		if(el.length == 0) return this;
		this.el = e;

		this.log('load',e,el,this.options.fit);

		var f = el.attr('vega-src');
		if(f) this.file = f;
		if(!this.file) this.file = "";
		if(typeof this.file!=="string") return this;
		if(typeof this.initializedValues==="undefined") this.initializedValues = {'w':e.clientWidth,'h':e.clientHeight};

		// Load any necessary extra js/css
		var _obj = this;
		var delay = false;
		if('ontouchstart' in document.documentElement && typeof Hammer==="undefined"){
			delay = true;
			S('.msg').html('Loading Hammer...').css({'display':'block'});
			S('header').css({'margin-top':'2em'});
			// Load the Javascript and, once done, call this function again
			TimeSeries.loadResources(basedir+"hammer/hammer.min.js", {"this":this, "el":e}, function(ev){ S('.msg').html('Hammer loaded'); this.log('loadedResources',ev,this); this.initialize(ev.data.el); });
		}
		// Do we need to load some extra Javascript?
		if(typeof Graph==="undefined" && typeof Graph!=="function"){
			delay = true;
			// Load the Javascript and, once done, call this function again
			TimeSeries.loadResources(basedir+"graph.js", {"this":this, "el":e}, function(ev){ this.log('loadedResources',ev,this); this.initialize(ev.data.el); });
		}
		if(!delay){
			if(this.file){
				// Load the Vega-JSON file
				var idx = this.file.lastIndexOf("/");
				this.directory = (idx >= 0) ? this.file.substr(0,idx+1) : "";
				S().ajax(this.file,{
					"dataType": "json",
					"this": this,
					"cache": true,
					"success": function(d,attr){
						this.processJSON(d);
						this.postProcess();
						return this;
					}
				});
			}else{
				this.postProcess();
				return this;
			}
		};
	
		return this;
	}

	TS.prototype.loadDatasets = function(data){
		this.log('loadDatasets',data)
		if(!data) return this;
		this.datasets = {};
		var n = data.length;
		var f = "";
		var files = [];
		var fn = function(csv,attr){
			var json = CSV2JSON(csv,attr.dataset.format.parse);
			this.datasets[attr.dataset.name] = json;
			this.update(attr.dataset.name);
			if(TimeSeries.filesLoaded(attr.files)) this.loaded();
		}

		// Build an array of files to load
		for(var i = 0; i < n; i++){
			if(data[i].url) files.push(this.directory + data[i].url);
		}

		this.log('files',files,TimeSeries.filesLoaded(files))

		// Process any inline values
		for(var i = 0; i < n; i++){
			if(data[i].values) fn.call(this,data[i].values,{'dataset':data[i],'files':files});
		}

		for(var j = 0; j < n; j++){
			// Load data and store it in datasets.
			// Update the graph if necessary
			// If we've loaded all data we then call loaded()
			TimeSeries.loadFromDataFile(files[j],{"this":this,"dataset":data[j],"files":files},fn);
		}

		return this;
	}

	TS.prototype.update = function(datasetID){

		var id,mark;
		this.olddatasetsused = this.datasetsused;
		this.datasetsused = "";

		this.log('update',datasetID)
		
		// This is much quicker than looseJsonParse
		// We'll use it for coordinates despite the eval()
		var ev = function(str,datum){ return eval(str); }

		function updateProperties(d,event){
		
			var dest = {'size':'props','shape':'props','fill':'props','fillOpacity':'props','stroke':'props','strokeOpacity':'props','strokeWidth':'props','strokeCap':'props','strokeDash':'props','width':'props','height':'props','tooltip':'props'};
		
			datum = d.data;

			for(var p in event){
				if(dest[p] && dest[p]=="props"){
					if(event[p].value){
						if(d.props.symbol) d.props.symbol[p] = event[p].value;
						if(d.props.format) d.props.format[p] = event[p].value;
					}
					if(event[p].signal){
						if(event[p].signal){
							try { d.props[p] = looseJsonParse(event[p].signal,d.data); }
							catch(e) { _obj.log('Error',d.data,event[p]); }
					
							// If we now have an object we build a string
							if(p=="tooltip" && typeof d.props[p]==="object"){
								str = "<table>";
								for(var i in d.props[p]){
									if(typeof d.props[p][i] != "undefined") str += "<tr><td>"+i+":</td><td>"+d.props[p][i]+"</td></tr>";
								}
								d.props[p] = str+"</table>";
							}
						}
					}
				}else{
					if(event[p].field && datum[event[p].field]) datum[p] = datum[event[p].field];
					if(event[p].signal){
						try { datum[p] = ev.call(datum,event[p].signal,datum); }
						catch(e) { _obj.log('Error',datum,event[p]); }
					}
				}
			}

			return d;
		}

		var _obj = this;

		for(var m = 0; m < this.json.marks.length; m++){
			id = "";
			mark = this.json.marks[m];
			if(mark.from.data) id = mark.from.data;
		
			if(this.datasets[id]){
				this.datasetsused += id;
			}

			if(this.datasets[id] && id==datasetID){
				var dataset;

				if(mark.type == "symbol") dataset = { data: clone(this.datasets[id]), title: id, type: mark.type, symbol: { show:true }, rect: { show:false }, lines: { show: false }, clickable: true, css:{'background-color':'#000000'} };
				else if(mark.type == "rect") dataset = { data: clone(this.datasets[id]), title: id, type: mark.type, symbol: { show:false }, rect: { show:true }, lines: { show: false }, clickable: true, css:{'background-color':'#000000'} };
				else if(mark.type == "line") dataset = { data: clone(this.datasets[id]), type: mark.type, symbol: { show:false }, rect: { show:false }, title: id, lines: { show: true }, clickable: true, css:{'background-color':'#000000'} };

				// Add the dataset
				if(dataset){

					if(mark.encode && mark.encode.hover){
						dataset.hoverable = true;
						if(mark.encode.hover.fill) dataset.css['background-color'] = mark.encode.hover.fill.value;
					}

					dataset.encode = mark.encode;

					// Add callbacks
					if(mark.encode.enter) dataset.enter = function(datum,event){ return updateProperties(datum,event); }
					if(mark.encode.update) dataset.update = function(datum,event){ return updateProperties(datum,event); }
					if(mark.encode.hover) dataset.hover = function(datum,event){ return updateProperties(datum,event); }

					// Now we add this mark-based dataset
					this.graph.addDataset(dataset,m);

				}else{
					this.log('No dataset built for '+id,mark);
				}
			}
		}

		// If the current list of datasets used is different
		// to what we've already processed, we will update the graph
		if(this.datasetsused != this.olddatasetsused && this.attr.showaswego) this.graph.updateData();

		return this;
	}
	TS.prototype.loaded = function(){
		this.log('loaded',this.attr.showaswego,this.graph.data);
		// If we haven't been updating the data for the graph we need to do that now
		if(this.attr.showaswego==false) this.graph.updateData();
		this.graph.canvas.container.find('.loader').remove();
		
		// CALLBACK
		if(typeof this.callback==="function") this.callback.call(this);
		return this;
	}

	/**
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
		delimiter = (delimiter || ","); // user-supplied delimeter or default comma

		var pattern = new RegExp( // regular expression to parse the CSV values.
			( // Delimiters:
				"(\\" + delimiter + "|\\r?\\n|\\r|^)" +
				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
				// Standard fields.
				"([^\"\\" + delimiter + "\\r\\n]*))"
			), "gi"
		);

		var rows = [[]];  // array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec( CSV_string )) {
			var matched_delimiter = matches[1]; // Get the matched delimiter
			// Check if the delimiter has a length (and is not the start of string)
			// and if it matches field delimiter. If not, it is a row delimiter.
			if (matched_delimiter.length && matched_delimiter !== delimiter) {
				// Since this is a new row of data, add an empty row to the array.
				rows.push( [] );
			}
			var matched_value;
			// Once we have eliminated the delimiter, check to see
			// what kind of value was captured (quoted or unquoted):
			if (matches[2]) { // found quoted value. unescape any double quotes.
				matched_value = matches[2].replace(
					new RegExp( "\"\"", "g" ), "\""
				);
			} else { // found a non-quoted value
				matched_value = matches[3];
			}
			// Now that we have our value string, let's add
			// it to the data array.
			rows[rows.length - 1].push(matched_value);
		}
		return rows; // Return the parsed data Array
	}

	// Function to parse a CSV file and return a JSON structure
	// Guesses the format of each column based on the data in it.
	function CSV2JSON(data,parse){

		// Split by the end of line characters
		if(typeof data==="string") data = CSVToArray(data);

		var line,datum,header,types,rows;
		var newdata = new Array();
		var formats = new Array();
		var header = new Array();

		formats = new Array(data[0].length)
		header = new Array(data[0].length)
		// Loop over each column in the line to find headers
		for(var j=0; j < data[0].length; j++){
			header[j] = data[0][j];
			formats[j] = parse[header[j]] || "string";
		}

		for(var i = 1 ; i < data.length; i++){
			// If there is no content on this line we skip it
			if(!data[i] || data[i] == "") continue;
			
			datum = {};
			// Loop over each column in the line
			for(var j=0; j < data[i].length; j++){
				if(formats[j]!="string"){
					// "number", "boolean" or "date"
					if(formats[j]=="number"){
						data[i][j] = parseFloat(data[i][j]);
					}else if(formats[j]=="date"){
						data[i][j] = new Date(data[i][j].replace(/^"/,"").replace(/"$/,""));
					}else if(formats[j]=="boolean"){
						if(data[i][j]=="1" || data[i][j]=="true" || data[i][j]=="Y") data[i][j] = true;
						else if(data[i][j]=="0" || data[i][j]=="false" || data[i][j]=="N") data[i][j] = false;
						else data[i][j] = null;
					}
				}
				datum[header[j]] = data[i][j];
				//if(header[j]=="HJD") datum['x'] = data[i][j];
				//if(header[j]=="dmag") datum['y'] = data[i][j];
			}
			newdata.push(datum);
		}

		// Return the structured data
		return newdata;
	}


	function looseJsonParse(obj,datum){

		var fns = "function zeroPad(d){ d = d+''; if(d.length==1){ d = '0'+d;} return d; };function timeFormat(t,f){var d = new Date(t);var ds = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];var dl = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];var ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];var ml = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return f.replace(/\%a/g,ds[d.getDay()]).replace(/\%Y/g,d.getFullYear()).replace(/\%a/g,dl[d.getDay()]).replace(/\%b/g,ms[d.getMonth()]).replace(/\%B/g,ml[d.getMonth()]).replace(/\%d/g,(d.getDate().length==1 ? '0':'')+d.getDate()).replace(/\%m/,(d.getMonth()+1)).replace(/\%H/,zeroPad(d.getUTCHours())).replace(/\%M/,zeroPad(d.getUTCMinutes())).replace(/\%S/,zeroPad(d.getUTCSeconds())).replace(/\%L/,d.getUTCMilliseconds());}";
		//YES %a - abbreviated weekday name.*
		//YES %A - full weekday name.*
		//YES %b - abbreviated month name.*
		//YES %B - full month name.*
		// %c - the locale’s date and time, such as %x, %X.*
		//YES %d - zero-padded day of the month as a decimal number [01,31].
		// %e - space-padded day of the month as a decimal number [ 1,31]; equivalent to %_d.
		// %f - microseconds as a decimal number [000000, 999999].
		// %H - hour (24-hour clock) as a decimal number [00,23].
		// %I - hour (12-hour clock) as a decimal number [01,12].
		// %j - day of the year as a decimal number [001,366].
		// %m - month as a decimal number [01,12].
		// %M - minute as a decimal number [00,59].
		// %L - milliseconds as a decimal number [000, 999].
		// %p - either AM or PM.*
		// %Q - milliseconds since UNIX epoch.
		// %s - seconds since UNIX epoch.
		// %S - second as a decimal number [00,61].
		// %u - Monday-based (ISO 8601) weekday as a decimal number [1,7].
		// %U - Sunday-based week of the year as a decimal number [00,53].
		// %V - ISO 8601 week of the year as a decimal number [01, 53].
		// %w - Sunday-based weekday as a decimal number [0,6].
		// %W - Monday-based week of the year as a decimal number [00,53].
		// %x - the locale’s date, such as %-m/%-d/%Y.*
		// %X - the locale’s time, such as %-I:%M:%S %p.*
		//YES %y - year without century as a decimal number [00,99].
		//YES %Y - year with century as a decimal number.
		// %Z - time zone offset, such as -0700, -07:00, -07, or Z.
		// %% - a literal percent sign (%).

		return Function('"use strict";'+fns+' return (' + obj + ')')();
	}

	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}

	root.AASTimeSeriesEmbed = function(el,json,opt){
		var ts = TimeSeries.create(json,opt);
		ts.initialize(S(el)[0]);
		return;
	}

	root.TimeSeries = TimeSeries;

})(window || this);


function Te(e, t, n, r) {
  var i = '<html><head>' + t + '</head><body><pre><code class="json">',
  o = '</code></pre>' + n + '</body></html>',
  a = window.open('');
  a.document.write(i + e + o),
  a.document.title = Ae[r] + ' JSON Source'
}

// Convert dates
dateFormat = "jd";
function formatDate(dt,t){
	if(!t) t = dateFormat;
	var d = new JD(dt,"unix");
	if(t=="jd") return d.valueOf().toFixed(3);
	else if(t=="mjd") return d.toMJD();
	else if(t=="iso") return d.toISOString();
	else return d;
}

// Can provide as:
//   1) (ms,"unix") - milliseconds since the UNIX epoch
//   2) (days,"mjd") - days since the MJD epoch
//   3) (seconds,"epoch","2000-01-01T00:00Z") - number of seconds since a user-defined epoch
//   4) ("1858-11-17T00:00:00.000001Z") - as an ISO8601 date string (can go to microseconds)
//   5) <undefined> - uses the current time
function JD(jd,t,offs){
	epoch = 2440587.5;	// The Julian Date of the Unix Time epoch is 2440587.5
	var secs = 86400;
	var scale = secs*1e6;
	if(typeof jd==="number"){
		if(typeof t!=="undefined"){
			if(t=="unix") this.val = u2jd(jd);
			else if(t=="epoch" && offs) this.val = u2jd((new Date(offs)).getTime() + jd*1000);
			else if(t=="mjd") jd += 2400000.5;
		}
		if(!this.val){
			var days = Math.floor(jd);
			this.val = [days,(jd - days)*scale];
		}
	}else this.val = u2jd(jd);
	var _obj = this;

	this.valueOf = function(){ return _obj.val[0] + _obj.val[1]/scale; }
	this.toUNIX = function(){ return ((_obj.val[0]-epoch)*scale + _obj.val[1])/1e3; }	// Milliseconds
	this.toMJD = function(){ return (_obj.val[0]+(_obj.val[1]/scale)-2400000.5); }
	this.toISOString = function(){ return (new Date(_obj.toUNIX())).toISOString(); }

	// Deal with Julian Date in two parts to avoid rounding errors
	// Input is either:
	//    1) the number of milliseconds since 1970-01-01
	//    2) the ISO8601 date string (can go to microseconds)
	//    3) <undefined> - uses the current time
	function u2jd(today) {
		// The Julian Date of the Unix Time epoch is 2440587.5
		var days = rem = ms = 0;
		if(typeof today==="undefined"){
			today = new Date();
			ms = today.getTime();
		}else if(typeof today==="string"){
			// We'll take the decimal seconds and deal with
			// them separately to avoid rounding errors.
			var s = 0;
			today = today.replace(/(\:[0-9]{2})\.([0-9]+)/,function(m,p1,p2){ s = parseFloat("0."+p2); return p1; });
			ms = (new Date(today)).getTime();
			ms += s*1000;
		}else ms = today*1000;
		days = Math.floor(ms/scale);
		rem = (ms - days*scale) + scale/2;
		return [days + epoch - 0.5,rem];
	}
	return this;
}
