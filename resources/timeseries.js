/*
	AAS Time Series graphing library
	Written by Stuart Lowe (Aperio Software)
	
	REQUIRES:
		stuquery.js
		graph.js
*/
(function(root){

	// Base directory for timeseries.js
	var basedir = "";

	// Main object to coordinate data loading
	TimeSeries = new function(){
		this.version = "0.0.8";
		this.create = function(json,opt){ return new TS(json,opt); }
		this.load = { 'resources': {'files':{},'callbacks':[]}, 'data': {'files':{},'callbacks':[]} }
		this.callback = "";
		this.logging = false;
		
		// Work out the file path to this code to use for further resources
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
					"dataType": "text",
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

			this.log('loadResources',files);

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

	// Object for each individual timeseries
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
			if(o=="fit" || o=="tooltip") this.options[o] = opt[o];	// https://github.com/vega/vega-tooltip/blob/master/docs/customizing_your_tooltip.md
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
		if(this.json.scales){
			for(var i = 0; i < this.json.scales.length; i++){
				if(this.json.scales[i].name=="yscale" && this.json.scales[i].type=="log") this.options.yaxis.log = true;
			}
		}

		// Build the graph object
		this.graph = new Graph(this.el, [], this.options)	

		var el = S(this.el);
		var str = '<div class="loader"><div class="spinner">';
		for(var i = 1; i < 6; i++) str += '<div class="rect'+i+' seasonal"></div>';
		str += '</div></div>';
		el.addClass('timeseries').append(str);

		// Build the menu
		this.makeMenu();

		if(this.json) this.loadDatasets(this.json.data);

		return this;
	}
	
	TS.prototype.makeMenu = function(){
		var el = S(this.el);
		var id = el.attr('id');
		var formats = {
			'default': {
				'title': 'Default'
			},
			'locale': {
				'title': 'Locale',
				'steps': [{'name': 'seconds','div':1000,'spacings':[0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.25,0.5,1,2,5,10,15]},
					{'name': 'minutes', 'div':60000,'spacings':[0.5,1,2,5,10,15,20,30]},
					{'name': 'hours', 'div':3600000,'spacings':[0.5,1,2,4,6]},
					{'name': 'days', 'div':86400000,'spacings':[0.5,1,2,7]},
					{'name': 'weeks', 'div':7*86400000,'spacings':[1,2,4,8]},
					{'name': 'years', 'div':31557600000,'spacings':[0.25,0.5,1,2,5,10,20,50,100,200,500,1000,2000,5000]}
				],
				'fn': function(j){
					var d = new Date(parseInt(j));
					return {'str':d.toLocaleString()};
				}
			},
			'jd': {
				'title': 'Julian date',
				'steps': [{'name': 'days', 'div':86400000,'spacings':[0.00001,0.00005,0.0001,0.0005,0.001,0.005,0.01,0.05,0.1,0.5,1,2,7,10,20,30,50,100,200,500,1000,2000,5000,10000]}],
				'fn': function(j){ return {'str':formatDate(parseInt(j),"jd")+''}; }
			},
			'mjd': {
				'title': 'Modified Julian date',
				'steps': [
					{'name': 'micro', 'div':864,'spacings':[0.00001,0.00005,0.0001,0.0005,0.001,0.005,0.01,0.05,0.1]},
					{'name': 'milli', 'div':86400,'spacings':[0.001,0.005,0.01,0.05,0.1]},
					{'name': 'days', 'div':86400000,'spacings':[0.0005,0.001,0.005,0.01,0.01,0.05,0.1,0.5,1,2,7,10,20,30,50,100,200,500,1000,2000,5000,10000]}
				],
				'fn': function(j){
					var mjd = formatDate(parseInt(j),"mjd");
					var o = {'str':mjd+''};
					if(this.x.spacing.name == "milli") o.truncated = mjd.toFixed(5)+'';
					if(this.x.spacing.name == "micro") o.truncated = mjd.toFixed(8)+'';
					return o;
				}
			}
		}

		if(el.find('.menuholder').length == 0){
			el.prepend('<div class="menuholder"><input type="checkbox" id="'+id+'_hamburger" class="hamburger"><label for="'+id+'_hamburger" class="hamburger"><span class="nv">Toggle menu (if not visible)</span></label><menu class="timeseries-actions-wrapper"><div class="row"><button class="fullscreen icon" title="Toggle fullscreen">'+getIcon('fit')+'</button><button class="autozoom">Zoom to data</button><button class="fontup">A&plus;</button><button class="fontreset">A</button><button class="fontdn">A&minus;</button></div><ol class="layers"></ol></menu></div>');

			// Add button events
			el.find('.menuholder').on('mouseover',function(){ S('.graph-tooltip').css({'display':'none'}); });
			el.find('#'+id+'_hamburger').on('click',{me:this},function(e){
				var tab = (this[0].checked ? 0 : -1);
				this.parent().find('menu button, menu a').attr('tabIndex', tab);
			});
			el.find('button.fullscreen').on('click',{g:this.graph},function(e){ e.data.g.toggleFullScreen(); });
			el.find('button.autozoom').on('click',{g:this.graph},function(e){ e.data.g.zoom(); });
			el.find('button.fontup').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(+1) });
			el.find('button.fontdn').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(-1) });
			el.find('button.fontreset').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(0) });

			// Build date selector
			var html = '<div class="row"><label for="'+id+'_dateformat">Date format: </label><select id="'+id+'_dateformat">';
			for(var k in formats) html += '<option value="'+k+'"'+(k=="default" ? ' selected="selected"':'')+'>'+formats[k].title+'</option>';
			html += '</select></div>';
			el.find('.layers').append(html);
			el.find('#'+id+'_dateformat').on('change',{graph:this.graph,formats:formats},function(e){
				e.data.graph.options.formatLabelX = e.data.formats[this[0].value];
				e.data.graph.defineAxis("x").calculateData().draw(true);
			});
		}
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
		// Do we need to load some extra Javascript?
		if(typeof Graph==="undefined" && typeof Graph!=="function"){
			// Load the Javascript and, once done, call this function again
			TimeSeries.loadResources(basedir+"graph.js", {"this":this, "el":e}, function(ev){ this.log('loadedResources',ev,this); this.initialize(ev.data.el); });
		}else{
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
			this.datasets[attr.dataset.name] = {'json':json,'parse':attr.dataset.format.parse};
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
			if(!d){
				console.log('updateProps fail',d,event)
				return;
			}
			datum = d.data;

			for(var p in event){
				if(dest[p] && dest[p]=="props"){
					if(typeof event[p].value !== "undefined"){
						if(d.props.symbol) d.props.symbol[p] = event[p].value;
						if(d.props.format) d.props.format[p] = event[p].value;
					}
					if(event[p].signal){
						if(event[p].signal){
							try { d.props[p] = looseJsonParse(event[p].signal); }
							catch(e) { _obj.log('Error',d.data,event[p]); }
					
							// If we now have an object we build a string
							if(p=="tooltip" && typeof d.props[p]==="object"){
								str = "<table>";
								for(var i in d.props[p]){
									if(typeof d.props[p][i] !== "undefined") str += "<tr><td>"+i+":</td><td>"+d.props[p][i]+"</td></tr>";
								}
								d.props[p] = str+"</table>";
							}
						}
					}
				}else{
					if(event[p].field && datum[event[p].field]) datum[p] = datum[event[p].field];
					if(typeof event[p].value!=="undefined") datum[p] = event[p].value;
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
			if(mark.from && mark.from.data){
				id = mark.from.data;
				if(this.datasets[id]) this.datasetsused += id;
			}

			if(!id || this.datasets[id]){
				var desc = mark.description || "";
				var dataset = { title: id, id: id, desc: desc, type: mark.type, clickable: true, css:{'background-color':'#000000'} };

				if(mark.type == "symbol") dataset.symbol = {show:true};
				else if(mark.type == "rect") dataset.rect = {show:true};
				else if(mark.type == "line") dataset.lines = {show:true};
				else if(mark.type == "rule") dataset.rule = {show:true};
				else if(mark.type == "area") dataset.area = {show:true};

				if(this.datasets[id]){
					dataset.data = clone(this.datasets[id].json);
					dataset.parse = this.datasets[id].parse;
				}else{
					dataset.data = [{'props':{'x':0,'y':0,'x2':0,'y2':0}}];
					dataset.parse = {};
				}

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
		
		var layers = this.graph.canvas.container.find('.layers');
		for(var i in this.graph.data){
			id = S(this.el).attr('id')+'_'+i;
			// Check if we've already added this
			if(layers.find('#'+id).length == 0){
				layers.append('<li><input type="checkbox" checked="checked" id="'+id+'" /><label for="'+id+'"><span class="key" style="background-color:'+this.graph.data[i].format.fill+';"></span>'+this.graph.data[i].desc+'</label></li>');
				layers.find('#'+id).on('change',{me:this,i:i},function(e){
					i = e.data.i;
					g = e.data.me.graph;
					g.data[i].show = !g.data[i].show;
					//this.parent().css({'display':(g.data[i].show ? '':'none')});
					g.calculateData().draw(true);
				}).parent().find('label').on('click',{me:this,id:id},function(e){
					//this.parent().find('input')[0].checked = !this.find('input')[0].checked;
					if(this.parent().find('input')[0].checked) this.addClass('inactive')
					else this.removeClass('inactive')
				});
			}
		}
		
		// CALLBACK
		if(typeof this.callback==="function") this.callback.call(this);
		return this;
	}

	function getIcon(icon,colour){
		var icons = {
			'fit':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOUR%" d="M 0,12 L0,0 12,0 12,4 6,4 12,10 10,12 4,6 4,12 M20,0 L 32,0 32,12 28,12 28,6 22,12 20,10 26,4 20,4 20,0 M 20,32 L20,28 26,28 20,22 22,20 28,26 28,20 32,20, 32,32 20,32 M 12,32 L 0,32 0,20 4,20 4,26 10,20 12,22 6,28 12,28 12,32" /></svg>'
		}
		return icons[icon].replace(/%COLOUR%/g,(colour||"black"));
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
			for(var j=0; j < data[i].length; j++) datum[header[j]] = data[i][j];
			newdata.push(datum);
		}

		// Return the structured data
		return newdata;
	}

	function looseJsonParse(obj){
		var fns = "function zeroPad(d,n){ if(!n){ n = 2;} d = d+''; while(d.length < n){ d = '0'+d; } return d; };function timeFormat(t,f){ var d = new Date(t); var micros = ''; var m = (t+'').match(/\\.([0-9]+)/);if(m && m.length==2){ micros = m[1]; } var ds = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];var dl = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];var ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];var ml = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return f.replace(/\%a/g,ds[d.getDay()]).replace(/\%Y/g,d.getFullYear()).replace(/\%a/g,dl[d.getDay()]).replace(/\%b/g,ms[d.getMonth()]).replace(/\%B/g,ml[d.getMonth()]).replace(/\%d/g,(d.getDate().length==1 ? '0':'')+d.getDate()).replace(/\%m/,(d.getMonth()+1)).replace(/\%H/,zeroPad(d.getUTCHours())).replace(/\%M/,zeroPad(d.getUTCMinutes())).replace(/\%S/,zeroPad(d.getUTCSeconds())).replace(/\%L/,zeroPad(d.getUTCMilliseconds(),3)+micros);}";
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
		//YES %L - milliseconds as a decimal number [000, 999].
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

	// Convert dates
	function formatDate(dt,t){
		if(!t) t = "jd";
		var d = new JD(dt,"unix");
		if(t=="jd") return d.valueOf();
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
		this.toISOString = function(){ return (new Date(_obj.toUNIX())).toISOString().replace(/\.0*([^0-9])/,function(m,p){ return p; }); }

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

	function Te(e, t, n, r) {
		var i = '<html><head>' + t + '</head><body><pre><code class="json">',
		o = '</code></pre>' + n + '</body></html>',
		a = window.open('');
		a.document.write(i + e + o),
		a.document.title = Ae[r] + ' JSON Source'
	}

	root.TimeSeries = TimeSeries;

})(window || this);
