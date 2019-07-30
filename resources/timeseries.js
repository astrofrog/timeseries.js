/*
	AAS Time Series graphing library
	Written by Stuart Lowe (Aperio Software)

	REQUIRES:
		stuquery.js - for DOM manipulation
		graph.js - for drawing the graph
		big.js - for dealing with imprecision/rounding issues in Javascript's maths
*/
(function(root){

	// Base directory for timeseries.js
	var basedir = "";

	/**
	 * @desc Main object to coordinate data loading. There will be one of these on a page.
	 */
	function TimeSeriesMaster(){

		this.version = "0.0.24";
		this.length = 0;

		/**
		 * @desc Create a new timeseries object (TS) for the specific timeseries graph
		 * @param {object} json - the VEGA JSON for the graph
		 * @param {boolean} opt.logging - do we log messages to the console?
		 * @param {boolean} opt.logtime - do we log execution times to the console?
		 */
		this.create = function(json,opt){
			if(!opt) opt = {};
			if(typeof opt.logging!=="boolean") opt.logging = this.log.logging;
			if(typeof opt.logtime!=="boolean") opt.logtime = this.log.logtime;
			opt.index = this.length;
			this.length++;
			return new TS(json,opt);
		};
		this.load = { 'resources': {'files':{},'callbacks':[]}, 'data': {'files':{},'callbacks':[]} };
		this.callback = "";
		// Object to hold lazy-loading scroll
		this.scroll = {};
		// Create a logger to log messages to the console
		this.log = new Logger({'id':'TimeSeries','logging':(location.search.indexOf('logging=true')>0),'logtime':(location.search.indexOf('logtime=true')>0)});

		// Work out the file path to this code to use for further resources
		var scripts = document.getElementsByTagName('script');
		var path = scripts[scripts.length-1].src.split('?')[0];
		var idx = path.lastIndexOf("/");
		basedir = (idx >= 0) ? path.substr(0,idx+1) : "";

		// Initial message to show that the library has loaded
		if(console) console.log('%ctimeseries.js v'+this.version+'%c','font-weight:bold;font-size:1.25em;','');

		/**
		 * @desc Load data from a file
		 * @param {string} f - the file URL
		 * @param {object} attr - attributes
		 * @param {function} fn - a callback function for once we finish loading
		 */
		this.loadFromDataFile = function(f,attr,fn){

			this.log.message('loadFromDataFile',f,attr,fn);

			attr.file = f;

			// If we haven't loaded the file, we get ready to do that
			if(!this.load.data.files[f]){
				this.log.time('loadFromDataFile '+f);
				this.load.data.files[f] = {'loaded':false,'callbacks':[]};
				if(!this.load.counter) this.load.counter = 0;
				if(!this.load.data.files[f].name) this.load.data.files[f].id = "file-"+(this.load.counter++);
				this.load.data.files[f].callbacks.push({'fn':fn,'attr':attr});
				this.log.message('loading data',f);
				attr['this'].updateMessage('main'+this.load.data.files[f].id,'Loading '+attr.dataset.name+'...');
				// Now grab the data
				S().ajax(f,{
					"dataType": "text",
					"this": this,
					"master": attr['this'],
					"file": f,
					"id": this.load.data.files[f].id,
					"success": function(d,attr){

						// Remove extra newlines at the end
						d = d.replace(/[\n\r]$/,"");

						// Update this displayed message
						attr.master.updateMessage('main'+attr.id,'');

						var cb = this.load.data.files[attr.file].callbacks;

						// Loop over any callbacks that have been attached to this file
						for(var i = 0; i < cb.length; i++){
							// Set original context dataset data
							this.load.data.files[cb[i].attr.file].data = d;
							this.load.data.files[cb[i].attr.file].loaded = true;

							if(typeof cb[i].fn==="function") cb[i].fn.call(cb[i].attr['this'],this.load.data.files[cb[i].attr.file].data,cb[i].attr);
						}
						this.log.message('loaded from data file '+attr.file);
						this.log.time('loadFromDataFile '+attr.file);

					},
					"error": function(err,attr){
						var cb = this.load.data.files[attr.file].callbacks;
						// Throw an error for each callback
						for(var i = 0; i < cb.length; i++) cb[i].attr['this'].error('Failed to load',attr.file,err);
					}
				});
			}else{
				// If we have started processing the file but haven't loaded it yet, we add a callback. 
				if(!this.load.data.files[f].loaded) this.load.data.files[f].callbacks.push({'fn':fn,'attr':attr});
				else{
					// Otherwise apply the callback if we've already loaded the data
					if(typeof fn==="function") fn.call(attr['this'],this.load.data.files[f].data,attr);
				}
			}
		};

		// Add scroll event for lazy-loading
		S(document).on('scroll',{me:this},function(e){
			var self = e.data.me, scroll = self.scroll;
			if(scroll){
				for(var id in scroll){
					if(typeof scroll[id].callback==="function"){
						e.data = (typeof scroll[id].data==="object") ? scroll[id].data : {};
						scroll[id].callback.call((e.data['this'] || self), e);
					}
				}
			}
		});

		return this;
	}

	// Create the master for the time series
	TimeSeries = new TimeSeriesMaster();

	/**
	 * @desc Object for each individual timeseries
	 * @param {object} json - the VEGA json to use
	 * @param {object} opt - attributes to define the time series
	 * @param {boolean} opt.logging - do we output console messages?
	 * @param {boolean} opt.logtime - do we record times?
	 * @param {boolean} opt.index - a unique ID for this timeseries in the master
	 */
	function TS(json,opt){
		if(!opt) opt = {};
		this.attr = opt;
		if(typeof json==="object"){
			this.json = json;
			this.vega = JSON.parse(JSON.stringify(json));
		}else if(typeof json==="string") this.file = json;
		// Create a logger to send messages to the console
		this.log = new Logger({'logging':(opt.logging || false),'logtime':(opt.logtime || false),'id':'TS'});
		if(typeof opt.showaswego==="undefined") opt.showaswego = false;
		this.log.message('TS',json);
		// Object for progress bars
		this.progress = {'datasets':{'old':'','used':''},'update':{'todo':0,'done':0}};

		// Set some default options
		this.options = {
			xaxis: { 'title':'Time', log: false, fit:true },
			yaxis: { 'title': 'y-axis', log: false },
			grid: { hoverable: true, clickable: true, 'color': '#888888' },
			labels: { 'color': '#000000' },
			fit: false,
			tooltip: {'theme':'aas-theme'},
			showaswego: opt.showaswego
		};
		
		// Define x-axis formatting options
		this.xformats = {
			'auto': {
				'title': 'Auto',
				'types': { 'absolute': true, 'relative': true},
				'scale': 1,
				'formatLabel': function(j,attr){
					var v = (attr.input=="seconds" || attr.input=="") ? j : convertDate(j,attr.input,"seconds");
					return {'str':attr.niceDate(v,attr.spacing)};
				}
			},
			'locale': {
				'title': 'Locale',
				'scale': 1,
				'types': {'absolute': true},
				'formatLabel': function(j,attr){ return {'str':(new Date(convertDate(j,attr.input,'unix'))).toLocaleString()}; }
			},
			'iso': {
				'title': 'ISO8601',
				'scale': 1,
				'types': {'absolute': true},
				'formatLabel': function(j,attr){
					var o = {'str':'?'};
					var v = convertDate(j,attr.input,attr.output);
					if(attr.spacing.name=="days") v = v.replace(/^([0-9]{4}-[0-9]{2}-[0-9]{2}).*/,function(m,p1){ return p1; });
					o.str = v.replace(/\.0+Z/,"Z");
					return o;
				}
			},
			'jd': {
				'title': 'Julian date',
				'scale': 86400,
				'types': {'absolute': true},
				'formatLabel': function(j,attr){ return {'str':convertDate(j,attr.input,attr.output)+''}; }
			},
			'mjd': {
				'title': 'Modified Julian date',
				'scale': 86400,
				'types': {'absolute': true},
				'formatLabel': function(j,attr){ return {'str':convertDate(j,attr.input,attr.output)+''}; }
			},
			'tjd': {
				'title': 'Truncated Julian date',
				'scale': 86400,
				'types': {'absolute': true},
				'formatLabel': function(j,attr){ return {'str':convertDate(j,attr.input,attr.output)+''}; }
			},
			'relative': {
				'title': 'Relative date',
				'types': {'relative': true},
				'scale': 1,
				'convert': function(v,input){
					if(input=="hours") return Num(v).times(3600).toValue();
					return v;
				},
				'formatLabel': function(val,attr){
					var typ,sign,v,s,sec,str,i,k,ds,b,bit,max;
					typ = typeof val;
					if(val==0) return {'str':'0'};
					if(typ=="string" || typ=="number") val = Num(val);
					if(val==null) return {'str':''};
					sign = (val.gte(0)) ? 1 : -1;

					// Keep the absolute value
					v = val.abs();
					// A working version of the absolute value
					s = val.abs();
					if(attr){
						// Get the maximum tick value (to make formatting consistent)
						max = Math.abs(attr.ticks[attr.ticks.length-1].value);
					}else{
						max = s;
					}
					if(typeof max.toValue==="function") max = max.toValue();

					b = ['y','d','h','m','s'];
					sec = {'y':86400*365.25,'d':86400,'h':3600,'m':60,'s':1};
					str = '';
					bit = {};
					for(i = 0; i < b.length; i++){
						k = b[i];
						ds = sec[k];
						bit[k] = Number(s.div(ds).round(0,0));
						s = s.minus(bit[k]*ds);
					}
					if(s.gt(0)){
						bit.f = s.toString();
						bit.f = bit.f.substr(bit.f.indexOf("."));
					}
					str = '';
					if(bit.y > 0) str = bit.y+'y';
					if(bit.d > 0) str += (str ? ' ':'')+bit.d+'d';
					if(max > sec.h) str += (str ? ' ':'')+zeroPad(bit.h,2)+':';
					if(max > sec.m) str += ''+zeroPad(bit.m,2);
					if(bit.s > 0 || bit.f) str += (max > sec.m||max > sec.h||v.gt(sec.d) ? ':':'')+(max > sec.s ? zeroPad(bit.s,2):bit.s);
					if(bit.f) str += bit.f;
					return {'str':(sign < 0 ? '-':'')+str};
				}
			},
			'seconds': {
				'title': 'Seconds',
				'types': {'relative':true },
				'convert': function(v,input){
					if(input=="hours") return Num(v).times(3600).toValue();
					else if(input=="days") return Num(v).times(86400).toValue();
					else if(input=="years") return Num(v).times(31557600).toValue();
					return v;
				}
			},
			'hours': {
				'title': 'Hours',
				'types': {'relative':true },
				'convert': function(v,input){
					if(input=="seconds" || input=="relative") return Num(v).div(3600).toValue();
					else if(input=="days") return Num(v).times(24).toValue();
					else if(input=="years") return Num(v).times(8766).toValue();
					return v;
				}
			},
			'days': {
				'title': 'Days',
				'types': {'relative':true },
				'convert': function(v,input){
					if(input=="seconds" || input=="relative") return Num(v).div(86400).toValue();
					else if(input=="hours") return Num(v).div(24).toValue();
					else if(input=="years") return Num(v).times(365.25).toValue();
					return v;
				}
			},
			'years': {
				'title': 'Years',
				'types': {'relative':true },
				'convert': function(v,input){
					if(input=="seconds" || input=="relative") return Num(v).div(31557600).toValue();
					else if(input=="hours") return Num(v).div(8766).toValue();
					else if(input=="days") return Num(v).div(365.25).toValue();
					return v;
				}
			},
			'unity': {
				'title': 'Phase (unity)',
				'types': {'phase': true},
				'convert': function(v,input){
					if(input == "degrees") return Num(v).div(360).toValue();
					else if(input == "radians") return Num(v).div(2).toValue();
					return v;
				},
				'formatLabel': function(j,attr){ return {'str':j.toString()}; }
			},
			'degrees': {
				'title': 'Phase (degrees)',
				'types': {'phase': true},
				'convert': function(v,input){
					if(input == "unity") v = Num(v).times(360).toValue();
					else if(input == "radians") v = Num(v).times(180).toValue();
					return v;
				},
				'spacing': function(r){
					if(r > 300) return 90;
					if(r > 200) return 60;
					if(r > 100) return 30;
					else return 0;
				},
				'formatLabel': function(j,attr){ return {'str':j.toString()+'°'}; }
			},
			'radians': {
				'title': 'Phase (radians)',
				'types': {'phase': true},
				'convert': function(v,input){
					if(input == "unity") return Num(v).times(2).toValue();
					else if(input == "degrees") return Num(v).div(180).toValue();
					return v;
				},
				'formatLabel': function(j,attr){ return {'str':j.toString()+'π'}; }
			}
		};
		this.datasets = [];
		this.directory = "";
		for(var o in opt){
			if(opt[o]){
				if(o=="directory") this[o] = opt[o];
				if(o=="fit" || o=="tooltip") this.options[o] = opt[o];	// https://github.com/vega/vega-tooltip/blob/master/docs/customizing_your_tooltip.md
			}
		}

		// If we have JSON we process it now
		if(this.json) this.processJSON(json);

		return this;
	}

	/**
	 * @desc Process the VEGA-compatible JSON. Only a sub-set of VEGA JSON will be processed.
	 * @param {object} d - the JSON object
	 */
	TS.prototype.processJSON = function(d){
		this.json = clone(d);
		this.vega = clone(d);
		this.log.message('processJSON',d,this.json);
		if(d.width) this.options.width = d.width;
		if(d.height) this.options.height = d.height;
		if(d.padding) this.options.padding = d.padding;

		// Work out the axes
		if(d.axes){
			for(var a = 0; a < d.axes.length; a++){
				var dim = "";
				if(d.axes[a].orient=="bottom") dim = "xaxis";
				if(d.axes[a].orient=="left") dim = "yaxis";
				if(dim) this.options[dim] = d.axes[a];
			}
		}
		return this;
	};

	/**
	 * @desc Render a TimeSeries from an HTML element (we will process the attributes <code>vega-src</code> and <code>vega-scale</code>)
	 * @param {HTMLelement} e - the DOM element to attach the time series to
	 * @param {function} callback - a function to call once finished
	 */
	TS.prototype.initialize = function(e,callback){

		// Only starting initializing once
		if(this.initializing) return this;

		this.log.message('initialize',e);
		this.initializing = true;

		// Store the callback function
		if(typeof callback==="function") this.callback = callback;

		if(!e) this.log.error(e,callback);

		// Get the DOM element as a stuQuery object
		var el = S(e);
		if(el.length == 0){
			this.log.error('No DOM element to attach to',e);
			return this;
		}
		// Keep a copy of the original HTMLelement
		this.el = e;

		// If the element has loading="lazy" we will wait until it is nearly on-screen before initializing it.
		if(e.getAttribute('loading')=="lazy"){
			if(!onscreen(e)){
				TimeSeries.scroll[this.attr.index] = {'data':{'me':this,'el':e,'callback':callback,'i':this.attr.index},'callback':function(e){
					if(onscreen(e.data.el)){
						e.data.me.initializing = false;
						// Remove the event so we don't trigger it again
						delete this.scroll[e.data.i];
						// Now we can call the initialize function
						e.data.me.initialize(e.data.el,e.data.callback);
					}
				}};
				return this;
			}
		}

		// Get the VEGA source file
		var f = el.attr('vega-src');
		if(f) this.file = f;
		if(!this.file) this.file = "";
		if(typeof this.file!=="string") return this;
		if(typeof this.initializedValues==="undefined") this.initializedValues = {'w':e.clientWidth,'h':e.clientHeight};

		if(this.file){
			// Load the Vega-JSON file
			var idx = this.file.lastIndexOf("/");
			this.directory = (idx >= 0) ? this.file.substr(0,idx+1) : "";
			S().ajax(this.file,{
				"dataType": "json",
				"this": this,
				"cache": true,
				"success": function(d,attr){
					if(!d){
						this.error('JSON is invalid',attr.url);
					}else{
						this.processJSON(d);
						this.postProcess();
					}
				},
				"error": function(err,attr){
					this.error("Unable to load configuration",attr.url,err);
				}
			});
		}else{
			this.postProcess();
			return this;
		}

		return this;
	};

	/**
	 * @desc A function to call once we've finished.
	 */
	TS.prototype.postProcess = function(){

		this.log.message('postProcess',this);
		this.log.time('postProcess');
		var a,axis,d,el,i,ii,str,s;

		// Post-process the JSON to extend things
		if(this.json){
			var addeddefault,view;

			// Build default view/views

			// Create a default extension object
			if(!this.json._extend) this.json._extend = {};
			// Create default views object
			if(!this.json._views) this.json._views = [];


			// Add some default name fields if they aren't provided
			ii = 0;
			for(i = 0; i < this.json.marks.length ; i++){
				// Create a name for this mark if one hasn't been given
				if(!this.json.marks[i].name){
					this.json.marks[i].name = "fake-id-"+ii;
					this.log.warning('No name for mark '+i+' so naming it '+this.json.marks[i].name);
				}
				ii++;
			}
			// Add default name fields to the extended marks too
			if(this.json._extend.marks){
				for(i = 0; i < this.json._extend.marks.length ; i++){
					// Create a name for this mark if one hasn't been given
					if(!this.json._extend.marks[i].name){
						this.json._extend.marks[i].name = "fake-id-"+ii;
						this.log.warning('No name for mark '+i+' so naming it '+this.json._extend.marks[i].name);
					}
					ii++;
				}
			}

			// Create default view
			addeddefault = false;
			for(i = 0; i < this.json._views.length; i++){
				if(this.json._views[i].name=="default"){
					addeddefault = true;
					view = clone(this.json._views[i]);
				}
			}
			if(!addeddefault){
				view = {
					'name': 'default',
					'title': (this.json.title || 'Default'),
					'description': (this.json.description || 'The initial view'),
					'markers': [],
				};
			}
			// Add some defaults if not defined
			if(!view.scales) view.scales = clone(this.json.scales);
			if(!view.axes) view.axes = clone(this.json.axes);
			if(!view._extend) view._extend = clone(this.json._extend);		// TimeSeries addition to VEGA spec
			if(!addeddefault){
				// Add marks
				for(i = 0; i < this.json.marks.length ; i++) view.markers.push({ "name": this.json.marks[i].name, "include": true, "visible": true });
				this.json._views.unshift(view);
			}
			this._view = view;
			// End building view
		}


		// Now construct the options for the Graph object
		// Over-ride the width/height if we are supposed to fit
		if(this.options.fit){
			this.options.width = this.initializedValues.w;
			this.options.height = this.initializedValues.h;
		}

		// Pass in the log options
		this.options.logging = this.log.logging;
		this.options.logtime = this.log.logtime;
		this.options.scrollWheelZoom = true;

		// If we have scales we loop over getting the options for each axis
		if(this.json.scales){
			for(a = 0; a < this.json.axes.length; a++){
				for(i = 0; i < this.json.scales.length; i++){
					if(this.json.axes[a].scale == this.json.scales[i].name){
						axis = (this.json.axes[a].orient=="left" ? "yaxis":"xaxis");
						this.options[axis].type = (this.json.scales[i].type || (axis=="xaxis" ? "utc" : "linear"));
						this.options[axis].padding = (this.json.scales[i].padding || 0);
						if(this.json.scales[i].range) this.options[axis].range = this.json.scales[i].range;
						if(this.json.scales[i].domain){
							this.options[axis].domain = clone(this.json.scales[i].domain);
							for(d = 0; d < this.options[axis].domain.length; d++){
								if(this.options[axis].domain[d].signal) this.options[axis].domain[d] = looseJsonParse(this.options[axis].domain[d].signal);
							}
						}
					}
				}
				// Check for properties in the extended scales
				if(this._view._extend.scales){
					for(s = 0; s < this._view._extend.scales.length; s++){
						if(this.json.axes[a].scale == this._view._extend.scales[s].name){
							axis = (this.json.axes[a].orient=="left" ? "yaxis":"xaxis");
							this.options[axis].highprecision = (this._view._extend.scales[s].highprecision || false);
						}
					}
				}
			}
		}

		// Build the graph object
		this.graph = new Graph(this.el, this.options);

		// Build loading animation
		el = S(this.el);
		str = '<div class="loader"><div class="spinner">';
		for(i = 1; i < 6; i++) str += '<div class="rect'+i+' seasonal"></div>';
		str += '</div></div>';
		el.addClass('timeseries').append(str);

		// Build the menu
		this.makeMenu();

		// Load the datasets if we have been given JSON
		if(this.json && this.json.data) this.loadDatasets(this.json.data);

		this.log.time('postProcess');

		return this;
	};

	/**
	 * @desc Update a message that sits on top of the graph
	 * @param {string} id - the CSS ID to use for the message
	 * @param {string} msg - the message to display
	 * @param {number} pc - (optional) if provided this will set the percentage of a progress bar
	 * @param {string} c - the colour of the progress bar
	 */
	TS.prototype.updateMessage = function(id,msg,pc,c){
		var el = S(this.el).find('.loader');
		if(!id){
			el.html('');
			return this;
		}
		if(!this.message) this.message = {};
		id = this.el.getAttribute('id')+'-'+id;
		if(!this.message[id]){
			el.append('<div id="'+id+'"><div class="loader-message"></div></div>');
			el = el.find('#'+id);
			this.message[id] = {'el':el,'message':el.find('.loader-message')};
		}
		// Add progress bars showing the current progress for each dataset
		if(msg || (typeof pc==="number" && pc <= 100)){
			if(this.message[id].message.length > 0) this.message[id].message[0].innerHTML = msg;
			if(typeof pc==="number" && pc <= 100){
				if(!this.message[id].progress){
					this.message[id].el.append('<div class="progressbar"><div class="progress-inner"></div></div>');
					this.message[id].progress = this.message[id].el.find('.progress-inner');
				}
				this.message[id].progress.css({'width':pc+'%'});
				if(c) this.message[id].progress.css({'background':c});
			}
		}else this.message[id].el.remove();
		return this;
	};

	/**
	 * @desc Make the menu if it isn't already made
	 */
	TS.prototype.makeMenu = function(){
		var el,id,i,str,html,menu;
		el = S(this.el);
		id = el.attr('id');

		if(el.find('.menuholder').length == 0){
			menu = [{
				'key': 'views',
				'title': 'Views',
				'html': '<ol class="views"></ol>'
			},{
				'key': 'layers',
				'title': 'Marker layers',
				'html': '<ol class="layers"></ol>',
				'on': true
			},{
				'key': 'config',
				'title': 'Options',
				'html': '<div class="row"><button class="fullscreen icon" title="Toggle fullscreen">'+getIcon('fit')+'</button><button class="autozoom">Reset view</button></div><div class="row"><button class="fontup">A&plus;</button><button class="fontreset">A</button><button class="fontdn">A&minus;</button></div>'
			},{
				'key': 'save',
				'title': 'Save',
				'html': '<div class="row"><button class="savepng" data="white">Save as PNG</button><button class="savepng">Save as transparent PNG</button><button class="savevega">Save as JSON (VEGA-compatible)</button><button class="editvega">Open selected view in VEGA</button></div>'
			},{
				'key': 'about',
				'title': 'About',
				'html': '<p>Figure produced with the <a href="https://aperiosoftware.github.io/timeseries.js/">AAS timeseries.js</a> package version '+TimeSeries.version+'.</p>'
			}];
			str = '';
			html = '';
			for(i = 0; i < menu.length; i++){
				str += '<li class="submenu-'+menu[i].key+'"><button '+(menu[i].on ? 'class="on" ':'')+'data="submenu-'+menu[i].key+'" title="'+menu[i].title+'">'+getIcon(menu[i].key,'white')+'</button></li>';
				html += (menu[i].html ? '<div class="menu-panel submenu-'+menu[i].key+(menu[i].on ? ' on':'')+'">'+menu[i].html+'</div>' : '');
			}
			str += '<li></li>';
			el.prepend('<div class="menuholder"><input type="checkbox" id="'+id+'_hamburger" class="hamburger"><label for="'+id+'_hamburger" class="hamburger">'+getIcon('menu','white')+'<span class="nv">Toggle menu (if not visible)</span></label><menu class="timeseries-actions-wrapper"><ul class="submenu">'+str+'</ul>'+html+'</menu></div>');
			// Turn this menu on
			for(i = 0; i < menu.length; i++){
				if(menu[i].on) el.find('submenu-'+menu[i].key).addClass('on');
			}

			// Add button events
			el.find('.menuholder').on('mouseover',function(){ S('.graph-tooltip').css({'display':'none'}); });
			el.find('#'+id+'_hamburger').on('click',{me:this},function(e){
				var tab = (this[0].checked ? 0 : -1);
				this.parent().find('menu button, menu a').attr('tabIndex', tab);
			});
			el.find('button.fullscreen').on('click',{g:this.graph},function(e){ e.data.g.toggleFullScreen(); });
			el.find('button.autozoom').on('click',{g:this.graph},function(e){ e.data.g.zoom(); });
			el.find('button.fontup').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(+1); });
			el.find('button.fontdn').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(-1); });
			el.find('button.fontreset').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(0); });
			el.find('button.savevega').on('click',{me:this},function(e){ e.data.me.save("vega"); });
			el.find('button.editvega').on('click',{me:this},function(e){ e.data.me.save("vegaeditor"); });
			el.find('button.savepng').on('click',{me:this},function(e){ e.data.me.save("png",{'background':S(e.currentTarget).attr('data')}); });

			el.find('.submenu button').on('click',{el:el},function(e){
				e.data.el.find('.on').removeClass('on');
				var me = S(e.currentTarget);
				var cls = me.attr('data');
				me.addClass('on');
				e.data.el.find('.menu-panel.'+cls).addClass('on');
			});
		}
		return this;
	};

	/**
	 * @desc Load the datasets
	 * @param {array} data - the VEGA <code>data</code> structure
	 */
	TS.prototype.loadDatasets = function(data){
		this.log.message('loadDatasets',data);
		this.log.time('loadDatasets');
		if(!data) return this;
		this.updateMessage('main','Loading data...');

		if(data.length==0){
			S(this.el).find('.loader').html('&#9888; No data defined');
			return this;
		}

		this.datasets = {};
		var n,f,files,fn,i,j;
		n = data.length;
		f = "";
		files = [];
		this.progress.datasets = {'todo':n,'done':0};

		fn = function(data,attr){
			var json;
			var typ = "json";
			if(attr && attr.dataset && attr.dataset.format && attr.dataset.format.type=="csv") typ = "csv";
			if(typ == "csv") json = CSV2JSON(data,attr.dataset.format.parse);
			else if(typ == "json") json = data[0];
			this.datasets[attr.dataset.name] = {'json':json,'parse':attr.dataset.format.parse};
			this.datasets[attr.dataset.name][typ] = data;
			this.progress.datasets.done++;
			this.log.message('loaded dataset',attr.dataset.name);
			if(this.progress.datasets.done==this.progress.datasets.todo) this.processDatasets();
		};

		// Build an array of files to load
		for(i = 0; i < n; i++){
			if(data[i].url) files.push(this.directory + data[i].url);
		}

		this.log.message('files',files);

		// Process any inline values
		for(i = 0; i < n; i++){
			if(data[i].values) fn.call(this,data[i].values,{'dataset':data[i],'files':files});
		}

		for(j = 0; j < files.length; j++){
			// Load data and store it in datasets.
			// Update the graph if necessary
			// If we've loaded all data we then use the callback we defined above
			TimeSeries.loadFromDataFile(files[j],{"this":this,"dataset":data[j],"files":files},fn);
		}
		this.updateMessage('main','');
		this.log.time('loadDatasets');

		return this;
	};

	/**
	 * @desc Build the menu for selecting layers
	 */
	TS.prototype.updateLayerMenu = function(){
		var i,j,id,styles,layers,l,p,k,w,h,draw,d,key,keyitems,lookup,scale,ctx,c,parent,show,include;

		// Build layer-toggle menu (submenu-layers)
		layers = this.graph.canvas.container.find('.layers');
		// Remove any existing list items as we may have started from an incomplete list
		layers.find('li').remove();

		keyitems = {};
		lookup = {};
		for(i in this.graph.marks){
			if(this.graph.marks[i]){
				id = S(this.el).attr('id')+'_'+i;
				key = this.graph.marks[i].desc;
				if(this.graph.marks[i].include){
					if(typeof keyitems[key]==="undefined") keyitems[key] = [];
					keyitems[key].push(i);
				}
			}
		}
		j = 0;
		for(key in keyitems){
			if(keyitems[key]){
				if(typeof keyitems[key]!=="undefined"){
					id = S(this.el).attr('id')+'_'+j;
					d = this.graph.marks[keyitems[key][0]];

					layers.append('<li><input type="checkbox" id="'+id+'" data="'+key+'" /><label for="'+id+'"><span class="key" style="background-color:'+d.format.fill+';'+(d.type=="area" && d.format.fillOpacity ? 'opacity:'+d.format.fillOpacity+';':'')+'">?</span>'+key+'</label></li>');
					l = layers.find('#'+id);
					p = l.parent();
					k = p.find('.key');
					// We need to add events
					l.on('change',{me:this,k:keyitems[key]},function(e){
						var g,i,j;
						g = e.data.me.graph;
						for(i = 0; i < e.data.k.length; i++){
							j = e.data.k[i];
							g.marks[j].show = !g.marks[j].show;
						}
						g.redraw({'update':true,'cancelable':false});
						if(e.currentTarget.checked) this.parent().removeClass('inactive');
						else this.parent().addClass('inactive');
					}).on('focus',{layers:layers},function(e){
						e.data.layers.find('li').removeClass('on').removeClass('selected');
						this.parent().addClass('on');
					});
					layers.on('mouseover',{layers:layers},function(e){
						e.data.layers.find('.selected').removeClass('selected');
					});
					lookup[keyitems[key][0]] = l.parent();

					// Do we need to draw key items?
					draw = false;
					for(i = 0; i < keyitems[key].length; i++){
						if(["symbol","rect","line","rule","text","area"].indexOf(d.type) >= 0) draw = true;
					}

					// Create a canvas for each key item if we need to
					if(draw && k.length==1){
						styles = window.getComputedStyle(k[0]);
						w = parseInt(styles.width);
						h = parseInt(styles.height);
						k.html('<canvas style="width:'+w+'px;height:'+h+'px;"></canvas>');
					}

					// Update all the key images
					if(p.find('canvas').length == 1){
						c = p.find('canvas')[0];
						w = parseInt(p.find('canvas').css('width'));
						h = parseInt(p.find('canvas').css('height'));
						ctx = c.getContext('2d');
						scale = window.devicePixelRatio;
						c.width = w*scale;
						c.height = h*scale;
						ctx.scale(scale,scale);
						ctx.clearRect(0,0,w,h);
						ctx.fillStyle = "#ffffff";
						ctx.rect(0,0,w,h);
						ctx.fill();
						for(i = 0; i < keyitems[key].length; i++){
							d = this.graph.marks[keyitems[key][i]];
							// Only add them if they are included in this view
							if(d.include){
								k.css({'background-color':'none'});
								// Set the canvas style
								this.graph.setCanvasStyles(ctx,d.mark[0]);
								// Draw the different types
								if(d.type=="symbol"){
									this.graph.drawShape(clone(d.mark[0]),{'ctx':ctx,'x':w/2,'y':h/2});
								}else if(d.type=="rect"){
									if(d.mark[0].props.x1 && d.mark[0].props.x2 && d.mark[0].props.y1 && d.mark[0].props.y2){
										// If this has x1,x2,y1,y2 it is more like an area
										this.graph.drawRect(clone(d.mark[0]),{'ctx':ctx,'x1':0,'y1':0,'x2':w,'y2':h});
									}else{
										// We probably just have x1,x2,y or x,y1,y2 so this is more like a line
										this.graph.drawRect(clone(d.mark[0]),{'ctx':ctx,'x1':w/2,'y1':0,'x2':w/2,'y2':h});
									}
								}else if(d.type=="area"){
									this.graph.drawRect(clone(d.mark[0]),{'ctx':ctx,'x1':0,'y1':0,'x2':w,'y2':h});
								}else if(d.type=="line"){
									ctx.beginPath();
									ctx.moveTo(0,h/2);
									ctx.lineTo(w,h/2);
									ctx.lineWidth = (d.encode.enter.strokeWidth.value||0.8);
									ctx.stroke();
								}else if(d.type=="rule"){
									ctx.beginPath();
									ctx.lineWidth = (d.encode.enter.strokeWidth.value||1);
									if(!d.data[0].x2) d.data[0].x2 = clone(d.data[0].x);
									if(!d.data[0].y2) d.data[0].y2 = clone(d.data[0].y);
									if(d.data[0].y.value == d.data[0].y2.value){
										ctx.moveTo(0,h/2 + 0.5);
										ctx.lineTo(w,h/2 + 0.5);
									}else if(d.data[0].x.value == d.data[0].x2.value){
										ctx.moveTo(w/2 + 0.5,0);
										ctx.lineTo(w/2 + 0.5,h);
									}else{
										ctx.moveTo(0,0);
										ctx.lineTo(w,h);
									}
									ctx.stroke();
								}else if(d.type=="text"){
									this.graph.drawTextLabel("T",w/2,h/2,{'ctx':ctx,'format':{'align':'center','baseline':'middle'}});
								}
							}
						}
					}

					// Work out if the key item should be included and if it is visible
					include = false;
					show = false;
					for(i = 0; i < keyitems[key].length; i++){
						if(this.graph.marks[keyitems[key][i]].include) include = true;
						if(this.graph.marks[keyitems[key][i]].show) show = true;
					}
					parent = layers.find('#'+id).parent();
					parent.css({'display':(include ? 'block':'none')});
					if(show){
						parent.removeClass('inactive');
						layers.find('#'+id)[0].checked = true;
					}else{
						parent.addClass('inactive');
						layers.find('#'+id)[0].checked = false;
					}
					j++;
				}
			}
		}

		// Add hover event to marks to highlight layers in selector
		this.graph.on('hoverpoint',{lookup:lookup,layers:layers},function(e){
			// Remove selected class from all li elements
			e.data.layers.find('li').removeClass('selected');
			if(e.matches.length == 0) return;
			for(var m = 0; m < e.matches.length; m++){
				if(e.data.lookup[e.matches[m].series]) e.data.lookup[e.matches[m].series].addClass('selected');
			}
		});
		return this;
	};

	/**
	 * @desc Get an array of the available views. Each will have a "title", "name", and "description".
	 */
	TS.prototype.getViews = function(){
		var views,i,v;
		views = [];
		v = this.json._views;
		for(i = 0; i < v.length; i++) views.push({'title':(v[i].title||""),'name':(v[i].name||""),'description':(v[i].description||"")});
		return views;
	};

	/**
	 * @desc Choose a view
	 * @param {number} i - the index of the view to select
	 */
	TS.prototype.setView = function(i,attr){
		var g,j,view,a,d,m,o,s,lis,li,axis,found,el,str;
		j = this.json;
		if(typeof i!=="number"){
			str = JSON.stringify(i);
			for(m = 0; m < j._views.length; m++){
				if(JSON.stringify(j._views[m]) == str){
					i = m;
					continue;
				}
			}
			if(typeof i!=="number"){
				this.log.error('Invalid view number provided: '+i);
				return this;
			}
		}
		if(typeof i!=="number"){
			this.log.error('Invalid view index provided: '+i);
			return this;
		}
		if(i >= j._views.length){
			this.log.error('The maximum index is '+(j._views.length-1)+'');
			return this;
		}
		for(m = 0; m < j._views.length; m++){
			j._views[m].active = (i==m);
		}
		view = clone(j._views[i]);
		o = {};
		for(a = 0; a < j.axes.length; a++){
			if(view.scales){
				for(s = 0; s < view.scales.length; s++){
					if(j.axes[a].scale == view.scales[s].name){
						axis = (j.axes[a].orient=="left" ? "yaxis":"xaxis");
						if(typeof o[axis]!=="object") o[axis] = {};
						// Set defaults
						o[axis].type = (axis=="xaxis" ? "utc" : "linear");
						o[axis].padding = 0;
						// If we've defined the scale we over-write the defaults
						if(view.scales[s]){
							if(typeof view.scales[s].type!=="undefined") o[axis].type = view.scales[s].type;
							if(typeof view.scales[s].padding!=="undefined") o[axis].padding = view.scales[s].padding;
						}

						if(view.scales[s].range || j._views[0].scales[s].range){
							o[axis].range = clone(view.scales[s].range || j._views[0].scales[s].range);
						}
						if(j._views[0].scales[s].domain || view.scales[s].domain){
							o[axis].domain = clone(view.scales[s].domain || j._views[0].scales[s].domain);
							for(d = 0; d < o[axis].domain.length; d++){
								if(o[axis].domain[d].signal) o[axis].domain[d] = looseJsonParse(o[axis].domain[d].signal);
							}
						}
					}
				}
			}
			if(view.axes){
				axis = (j.axes[a].orient=="left" ? "yaxis":"xaxis");
				// Set the title of the axis
				o[axis].title = (typeof view.axes[a].title!=="undefined" ? view.axes[a].title:"");
			}
		}
		this._view = view;

		// Set the options
		g = this.graph;
		g.setOptions(o);
		if(view.markers){
			for(m in g.marks){
				if(g.marks[m]){
					found = -1;
					g.marks[m].include = false;
					for(s = 0; s < view.markers.length; s++){
						if(g.marks[m].name == view.markers[s].name){
							found = s;
							g.marks[m].include = true;
							g.marks[m].show = view.markers[s].visible;
						}
					}
				}
			}
		}else{
			this.log.warning('No markers provided for view.'+(view.marks ? ' You may have accidentally used "marks" as the key.':''));
		}

		this.updateLayerMenu();

		// Update the Options menu
		this.updateOptionsMenu();

		// Update the DOM to show which is selected
		el = g.canvas.container.find('.views');
		lis = el.find('li');
		for(m = 0; m < lis.length; m++){
			li = S(lis[m]);
			// If the list item is checked we add the selected class
			if(i==m) li.addClass('selected').find('input').attr('checked','checked');
			else li.removeClass('selected').find('input').attr('checked','');
		}

		// Update the graph data
		g.updateData(attr);

		return this;
	};

	/**
	 * @desc Update the view menu
	 */
	TS.prototype.updateViewMenu = function(){
		var i,l,el,id,li,active,alpha;
		alpha = 'abcdefghijklmnopqrstuvwxyz';

		el = this.graph.canvas.container.find('.views');
		li = this.graph.canvas.container.find('.submenu-views');

		// We need more than one view to exist to justify the view menu
		if(this.json._views.length < 2){
			el.css({'display':'none'});
			li.css({'display':'none'});
			return this;
		}else{
			el.css({'display':''});
			li.css({'display':''});
		}

		active = 0;
		for(i = 0; i < this.json._views.length; i++){
			if(this.json._views[i].active) active = this.json._views[i].active;
		}
		this.json._views[active].active = true;
		for(i = 0; i < this.json._views.length; i++){

			// Build the ID for this view
			id = S(this.el).attr('id')+'-view-'+i;
			// Check if we've already added it
			if(el.find('#'+id).length == 0){
				el.append('<li '+(this.json._views[i].active ? ' class="selected"':'')+'><input type="radio"'+(this.json._views[i].active ? ' checked="checked"':'')+' id="'+id+'" name="'+S(this.el).attr('id')+'-view" data="'+i+'" /><label for="'+id+'" title="'+this.json._views[i].description+'"><span style="font-family:monospace;">'+alpha.substr(i,1).toUpperCase()+'.</span> '+this.json._views[i].title+'</label></li>');
				l = el.find('#'+id);
				l.on('change',{me:this,id:id,i:i,el:el},function(e){
					e.data.me.setView(e.data.i);
				}).on('focus',{el:el},function(e){
					e.data.el.find('li').removeClass('on');
					this.parent().addClass('on');
				});
			}
		}
		return this;
	};

	/**
	 * @desc Update the options menu
	 */
	TS.prototype.updateOptionsMenu = function(){
		var el = S(this.el);
		var id = el.attr('id');

		// Remove any existing date format drop down selector
		if(el.find('#'+id+'_axisformat').length > 0) el.find('#'+id+'_axisformat').parent().remove();

		// If the x-axis has a defined input format we can build a format selector
		if(this._view._extend && this._view._extend.scales){
			var f,i,k,s,label,html,ok,inp;
			for(s = 0; s < this._view._extend.scales.length; s++){
				if(this._view._extend.scales[s].name=="xscale"){

					// Define the general type for the input format: phase/relative/absolute
					inp = this._view._extend.scales[s].input;
					i = "absolute";
					if(this.xformats[inp].types.phase) i = "phase";
					if(this.xformats[inp].types.relative) i = "relative";

					// If the input format and the translation are not valid
					if(!this.xformats[inp] && !this.xformats[i]){
						this.log.error('Input format "'+inp+'" is not valid.');
						return this;
					}

					if(i=="phase"){
						// We are showing phases
						f = (this._view._extend.scales[s].output || "unity");
						label = "Phase format";
					}else{
						// We are showing dates
						f = (this._view._extend.scales[s].output || "auto");
						label = "Date format";
					}
					html = '<div class="row"><label for="'+id+'_axisformat">'+label+': </label><select id="'+id+'_axisformat">';
					ok = false;
					for(k in this.xformats){
						if(this.xformats[k] && this.xformats[k].types[i]){
							html += '<option value="'+k+'"'+(k==f ? ' selected="selected"':'')+'>'+this.xformats[k].title+'</option>';
							if(f && this.xformats[f] && k==f) this.setAxisFormat("x",f);
							if(k==f) ok = true;
						}
					}
					if(!ok) this.log.error(f+" is not an available format",this.xformats,i);
					html += '</select></div>';
					el.find('.menu-panel.submenu-config').append(html);
					el.find('#'+id+'_axisformat').on('change',{'me':this},function(e){ e.data.me.setAxisFormat("x",this[0].value,false); });
				}
			}
		}

		return this;
	};

	/**
	 * @desc Set the x-axis format
	 * @param {string} axis - the axis to use e.g. "x" or "y"
	 * @param {string} output - the output format key e.g. "unity" or "jd"
	 * @param {boolean} update - do we redraw the graph?
	 */
	TS.prototype.setAxisFormat = function(axis,output,update){

		var input = "";
		if(this._view && this._view._extend.scales){
			for(var s = 0; s < this._view._extend.scales.length; s++){
				if(this._view._extend.scales[s].name=="xscale") input = this._view._extend.scales[s].input;
			}
		}
		if(this.graph){
			if(this.xformats[output]){
				this.graph[axis].units = input;	// TO DO: Do we need to update the input units?
				this.graph.setAxisFormat(axis,output,this.xformats);
				// Define the axis set to the current range
				this.graph.defineAxis(axis,this.graph[axis].min,this.graph[axis].max).redraw(update);
			}else{
				if(!this.xformats[input]) this.log.error('Input format '+input+' is not a known format');
				if(!this.xformats[output]) this.log.error('Output format '+output+' is not a known format');
			}
		}
		return this;
	};

	/**
	 * @desc Process the datasets. This updates the properties of each mark.
	 */
	TS.prototype.processDatasets = function(){
		this.log.message('processDatasets',this.attr.showaswego,this.graph.marks);
		this.log.time('processDatasets');

		var i,id,mark,m,fn,up,ms,n;

		// Set up the progress object to monitor what we've done for each mark
		if(!this.progress.marks) this.progress.marks = {'todo':0,'done':0,'mark':{}};
		ms = [this.json.marks];
		if(this.json._extend.marks) ms.push(this.json._extend.marks);
		for(m = 0,n = 0; m < ms.length; m++){
			for(i = 0; i < ms[m].length ; i++){
				// Create a name for this mark if one hasn't been given
				if(!ms[m][i].name) this.log.error('No name for '+ms[m][i].title+' ('+i+')');
				else this.progress.marks.mark[ms[m][i].name] = {'done':-1,'todo':0};
				n++;
			}
		}

		this.progress.datasets.old = this.progress.datasets.used;




		for(id in this.datasets){
			if(this.datasets[id] && !this.datasets[id].data) this.datasets[id].data = this.datasets[id].json;
		}
		
		// Add the datasets to the Graph object
		this.graph.addDatasets(this.datasets);

		// Store the number of marks we are going to process
		this.progress.marks.todo = this.json.marks.length + (this.json._extend.marks ? this.json._extend.marks.length : 0);

		// Define the callback functions:
		// Function called once addMarks has finally finished
		fn = function(e){
			this.progress.marks.done++;
			this.progress.marks.mark[e.name].done = e.i;
			this.progress.marks.mark[e.name].todo = e.total;

			// Update the total for this mark
			this.log.message('Processed '+e.name,this.progress.marks.mark[e.name]);
			this.updateMessage(e.name,'');

			// Now we update everything
			if(this.attr.showaswego) this.graph.updateData();
			if(this.progress.marks.done == this.progress.marks.todo) this.finalize();
		};
		// Function called during the processing of addMarks. It is to let us have a progress bar
		up = function(e){

			// Update our counters
			this.progress.marks.mark[e.mark.name].done = e.i;
			this.progress.marks.mark[e.mark.name].todo = e.total;

			// Get the colour of the mark so that we can use the same colour for the progress bar
			var colour = '';
			if(e.mark.encode && e.mark.encode.update){
				if(e.mark.encode.update.fill) colour = e.mark.encode.update.fill.value;
				if(!colour && e.mark.encode.update.stroke) colour = e.mark.encode.update.stroke.value;
			}

			// Add a message displaying the current progress for this layer
			this.updateMessage(e.mark.name,'Processing '+(e.mark.description||e.mark.name),100*e.i/e.total,colour);
			return this;
		};
		this.updateMessage('main','');
		for(m = 0; m < this.json.marks.length; m++){
			mark = clone(this.json.marks[m]);
			if(this.progress.marks.mark[mark.name].done <= 0){
				this.progress.marks.mark[mark.name].done = 0;
				addMarks(this,m,mark,{'success':fn,'progress':up});
			}
		}
		if(this.json._extend.marks){
			for(m = 0; m < this.json._extend.marks.length; m++){
				mark = this.json._extend.marks[m];
				mark.include = false;
				addMarks(this,m+this.json.marks.length+m,clone(mark),{'success':fn,'progress':up});
			}
		}
		for(m in this.graph.marks){
			if(this.graph.marks[m]){
				for(i = 0; i < this._view.markers.length; i++){
					if(this.graph.marks[m].name==this._view.markers[i].name){
						if(!this._view.markers[i].visible) this.graph.marks[m].show = false;
					}
				}
			}
		}

		// If the current list of datasets used is different
		// to what we've already processed, we will update the graph
		if(this.progress.datasets.used != this.progress.datasets.old && this.attr.showaswego) this.graph.updateData();

		this.log.time('processDatasets');

		return this;
	};

	/**
	 * @desc Once we've finished updating the marks we can update the menus
	 */
	TS.prototype.finalize = function(){
		this.log.message('finalize',this.attr.showaswego,this.graph.marks);
		this.updateMessage('main','');

		// Function to call once the graph is drawn
		function done(self){
			this.graph.canvas.container.find('.loader').remove();

			// Build the menus
			this.updateLayerMenu();
			this.updateViewMenu();
			this.updateOptionsMenu();

			// CALLBACK
			if(typeof this.callback==="function") this.callback.call(this);

      this.log.info('Finished processing '+this.el.getAttribute('id'));

		}

		// If we haven't been updating the data for the graph we need to do that now
		if(this.attr.showaswego==false) this.graph.updateData({callback:done,self:this});
		else done(this);

		return this;
	};

	/**
	 * @desc Save the output as either an image or JSON (and optionally send to the online VEGA editor)
	 * @param {string} type - the file type e.g. "text/text"
	 * @param {string} attr.file - the file name to use (defaults to timeseries.json)
	 * @param {string} attr.background - the colour to use for the background
	 */
	TS.prototype.save = function(type,attr){

		// Bail out if there is no Blob function to save with
		if(typeof Blob!=="function") return this;
		var i,txt,s,view,opts,typ,output;
		opts = { 'type': 'text/text', 'file': (this.file ? this.file.replace(/.*\//g,"") : "timeseries.json") };
		if(!attr) attr = {};

		function save(content){
			var asBlob = new Blob([content], {type:opts.type});
			function destroyClickedElement(event){ document.body.removeChild(event.target); }

			var dl = document.createElement("a");
			dl.download = opts.file;
			dl.innerHTML = "Download File";
			if(window.webkitURL != null){
				// Chrome allows the link to be clicked
				// without actually adding it to the DOM.
				dl.href = window.webkitURL.createObjectURL(asBlob);
			}else{
				// Firefox requires the link to be added to the DOM
				// before it can be clicked.
				dl.href = window.URL.createObjectURL(asBlob);
				dl.onclick = destroyClickedElement;
				dl.style.display = "none";
				document.body.appendChild(dl);
			}
			dl.click();

		}

		if(type == "vega" || type == "vegaeditor"){
			output = clone(this.vega);
			for(i = 0; i < output.data.length; i++){
				delete output.data[i].url;
				typ = "json";
				if(this.datasets[output.data[i].name].csv) typ = "csv";
				output.data[i].values = this.datasets[output.data[i].name][typ];
			}

			if(type == "vegaeditor"){
				view = this._view;

				// Update markers section
				var marks = [];
				var done = {};
				var found,m;

				for(m = 0; m < view.markers.length; m++){
					found = false;
					for(s = 0; s < this.json.marks.length; s++){
						if(!done[view.markers[m].name] && this.json.marks[s].name == view.markers[m].name){
							marks.push(clone(this.json.marks[s]));
							done[view.markers[m].name] = true;
						}
					}
					if(!done[view.markers[m].name] && this.json._extend && this.json._extend.marks){
						for(s = 0; s < this.json._extend.marks.length; s++){
							if(!done[view.markers[m].name] && this.json._extend.marks[s].name == view.markers[m].name){
								marks.push(clone(this.json._extend.marks[s]));
								done[view.markers[m].name] = true;
							}
						}
					}
				}
				output.marks = marks;
				if(view.scales) output.scales = view.scales;
				if(view.axes) output.axes = view.axes;
				if(view.title) output.title = view.title;

				// Remove our custom views and extended properties
				delete output._extend;
				delete output._views;
			}

			// Convert to text for sending
			txt = JSON.stringify(output);
		}
		if(type == "vega"){
			opts.type = "text/json";
			opts.file = (this.file ? this.file.replace(/.*\//g,"") : (attr.file||"timeseries.json"));
			save(txt);
		}
		if(type == "vegaeditor"){
			// Open in VEGA editor
			var vegaeditor = window.open("https://vega.github.io/editor/#/", "VEGA", "");
			setTimeout(function(){
				vegaeditor.postMessage({
					"mode": "vega",
					"spec": txt,
					"config": {
					"axisY": {
						"minExtent": 30
					}
					},
					"renderer": "svg"
				}, "https://vega.github.io");
			},1000);
		}
		if(type == "png"){
			if(attr && attr.background){
				this.graph.background = attr.background;
				this.graph.clear().drawAxes().resetDataStyles().drawData(false);
			}
			opts.type = "image/png";
			opts.file = (attr.file||"timeseries.png");
			this.graph.canvas.c.toBlob(save,opts.type);
			if(attr){
				this.graph.background = "";
				this.graph.clear().drawAxes().resetDataStyles().drawData(false);
			}
		}

		return this;
	};

	/**
	 * @desc Show an error message on the DOM
	 */
	TS.prototype.error = function(msg,extra,err){
		this.log.error(msg,extra,err);
		if(S(this.el).find('.loader').length == 0){
			S(this.el).html('<div class="loader"><div class="spinner"></div></div>').css({'position':'relative','width':'100%','height':'200px'});
		}
		// Replace spinner with error message
		if(S(this.el).find('.spinner').length > 0){
			S(this.el).find('.loader').html('&#9888; '+msg);
			this.remove();
		}
		S(this.el).find('.loader').append('<br />'+extra+'');

		return this;
	};

	/**
	 * @desc Remove a timeseries
	 */
	TS.prototype.remove = function(){
		S(this.el).find('.menuholder').remove();
		S(this.el).find('.canvasholder').remove();
		return {};
	};


	/** 
	  * @desc Add a bunch of marks
	  * @param {object} me - the TS object
	  * @param {integer} m - the index of the mark
	  * @param {object} mark - the mark object
	  * @param {object} attr - other attributes
	  * @param {function} attr.progress - called as marks are being added (to let us update a progress bar)
	  * @param {function} attr.success - called when the marks have been added
	  */
	function addMarks(me,m,mark,attr){
		var id = "";
		var exists = true;

		if(!attr) attr = {};
		// Update the 'this' property
		attr["this"] = me;

		if(mark.from && mark.from.data){
			if(typeof me.datasets[mark.from.data]==="undefined"){
				me.log.error('Data source '+mark.from.data+' doesn\'t seem to exist.');
				exists = false;
			}
			id = mark.from.data;
			if(me.datasets[id]) me.progress.datasets.used += id;
		}

		// Only bother building this dataset if it hasn't already been added.
		// A mark can have no dataset associated with it if it is "text" or a "rule"
		if((!id || me.datasets[id] || !exists) && !me.graph.marks[m]){
			var desc = mark.description || "Markers "+(m+1);
			var dataset = { 'title': id, 'id': id, 'name': (mark.name||""), 'desc': desc, 'type': mark.type, 'interactive': (typeof mark.interactive==="boolean" ? mark.interactive : true), 'css':{'background-color':'#000000'}, 'include': (typeof mark.include==="boolean" ? mark.include : true) };

			if(mark.type == "symbol") dataset.symbol = {show:true};
			else if(mark.type == "rect") dataset.rect = {show:true};
			else if(mark.type == "line") dataset.lines = {show:true};
			else if(mark.type == "rule") dataset.rule = {show:true};
			else if(mark.type == "area") dataset.area = {show:true};
			else if(mark.type == "text") dataset.text = {show:true};

			if(me.datasets[id]){
				dataset.data = clone(me.datasets[id].json);
				dataset.original = clone(me.datasets[id].json);
				dataset.parse = me.datasets[id].parse;
			}else{
				if(id && !me.datasets[id]) me.log.error('No dataset for '+mark.name);
				dataset.data = [{'props':{'x':0,'y':0,'x2':0,'y2':0}}];
				dataset.original = {};
				dataset.parse = {};
			}

			// Add the dataset
			if(dataset){

				if(mark.encode && mark.encode.hover) dataset.hoverable = true;

				dataset.encode = mark.encode;

				// Add callbacks
				if(mark.encode.enter) dataset.enter = function(d,event){ return updateProperties(this,d,event); };
				if(mark.encode.update) dataset.update = function(d,event){ return updateProperties(this,d,event); };
				if(mark.encode.hover) dataset.hover = function(d,event){ return updateProperties(this,d,event); };

				// Is this marker layer clipped?
				dataset.clip = (mark.clip || false);

				// Now we add this mark-based dataset
				me.graph.addMarks(dataset,m,mark,attr);
				if(me.datasets[id]) me.datasets[id].added = true;

			}else{
				me.log.message('No dataset built for '+id,mark);
			}
		}
		return me;
	}

	/** 
	  * @desc Update the properties of the data point using the event JSON
	  * @param {object} self - the TS object
	  * @param {object} d - the datum object
	  * @param {object} event - the event JSON
	  */
	function updateProperties(self,d,event){
		var to,str,i,p,sig;

		// Where to put the updated property
		var dest = {'size':'props','shape':'props','fill':'props','fillOpacity':'props','stroke':'props','strokeOpacity':'props','strokeWidth':'props','strokeCap':'props','strokeDash':'props','width':'props','height':'props','tooltip':'props','font':'props','fontSize':'props','fontWeight':'props','fontStyle':'props','baseline':'props','align':'props','dx':'props','angle':'props','limit':'props'};

		// If there is no datum, we will give up
		if(!d) return self.log.warning('updateProps fail',d,event);

		// Loop over each property of the event
		for(p in event){
			if(event[p]){
				if(dest[p] && dest[p]=="props"){
					if(typeof event[p].value !== "undefined"){
						if(d.props.symbol) d.props.symbol[p] = event[p].value;
						if(d.props.format) d.props.format[p] = event[p].value;
					}
				}else{
					if(typeof d.data[p]==="undefined") d.data[p] = clone(event[p]);
					if(event[p].field){
						if(typeof event[p].field==="string"){
							if(typeof d.data[event[p].field]!=="undefined") d.data[p] = d.data[event[p].field];
							else self.log.error('The field "'+event[p].field+'" ('+p+'-axis) seems to be missing.',clone(d),event);
						}else if(typeof event[p].field==="object"){
							d.data[p] = clone(event[p]);
						}
					}
					if(typeof event[p].value!=="undefined"){
						if(event[p].format && event[p].format=="date") d.data[p].value = (new Date(event[p].value)).getTime()/1000;
						else d.data[p].value = event[p].value;
					}
				}

				// Do we need to process a signal property?
				if(event[p].signal){
					// Make a clone of the signal and work on that rather than the original
					sig = clone(event[p].signal);

					// If the value of the signal is set to "datum" we default to a table of the original properties
					if(sig=="datum") sig = JSON.stringify(d.original);

					// Where are we putting the updated value?
					to = dest[p] || "data";
					if(typeof d[to][p]==="undefined") d[to][p] = {};

					// Try parsing the string as JSON
					try { d[to][p].value = looseJsonParse(sig,d.data); }
					catch(e) { self.log.error('Unable to parse signal',d.data,d.data,sig); }

					// Do special things for the tooltip property
					if(p=="tooltip"){
						// If we now have an object we build a string
						if(typeof d.props[p].value==="object"){
							str = "<table>";
							for(i in d.props[p].value){
								if(typeof d.props[p].value[i] !== "undefined") str += "<tr><td>"+i+":</td><td>"+d.props[p].value[i]+"</td></tr>";
							}
							d.props[p] = str+"</table>";
						}else d.props[p] = d.props[p].value;
					}
				}
			}
		}
		return d;
	}
	/**
	 * @desc Get an SVG icon
	 * @param {string} icon - the key for the icon
	 * @param {string} colour - the colour to use for the icon
	 */
	function getIcon(icon,colour){
		var icons = {
			'menu': '<path style="fill:%COLOUR%;fill-opacity: 0.8;" d="M 5,6 l 22,0 0,4 -22,0 0,-4 M 5,14 l 22,0 0,4 -22,0 0,-4 M 5,22 l 22,0 0,4 -22,0 0,-4 " />',
			'fit':'<path style="fill:%COLOUR%" d="M 0,12 L0,0 12,0 12,4 6,4 12,10 10,12 4,6 4,12 M20,0 L 32,0 32,12 28,12 28,6 22,12 20,10 26,4 20,4 20,0 M 20,32 L20,28 26,28 20,22 22,20 28,26 28,20 32,20, 32,32 20,32 M 12,32 L 0,32 0,20 4,20 4,26 10,20 12,22 6,28 12,28 12,32" />',
			'layers': '<path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 16,6 l 12,6.5 -12,6.5 -12,-6.5Z" /><path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 16,10.5 l 12,6.5 -12,6.5 -12,-6.5 Z" /><path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 16,15 l 12,6.5 -12,6.5 -12,-6.5 Z" />',
			'views': '<path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 5,5 l 10,0 0,10 -10,0 0,-2 4,0 0,-2.5 2,0 0,2.5 1,0 0,-5 -1,-1 -2,0 -1,1 3,0 0,1.5 -2,0 0,-1.5 -1,0 0,5 -3,0Z M 17,5 l 10,0 0,10 -10,0 0,-2 6,0 1,-1 0,-1 -1,-1 1,-1 0,-1 -1,-1 -2,0 0,1 2,0 0,1 -0.5,0.5 -1.5,0 0,1 1.5,0 0.5,0.5 0,1 -2,0 0,-5 -1,0 0,6 -3,0Z M 5,17 l 10,0 0,10 -10,0 0,-2 4,0 3,0 0,-1 -3,0 0,-4 3,0 0,-1 -3,0 -1,1 0,4 1,1 -4,0Z M 17,17 l 10,0 0,10 -10,0 0,-2 6,0 1,-1 0,-4 -1,-1 -3,0 0,1 3,0 0,4 -2,0 0,-4 -1,0 0,5 -3,0Z" />',
			'config': '<path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 13.971 4.5996 L 13.377 7.6992 L 13.453 7.6992 A 8.661 8.661 0 0 0 12.008 8.291 L 9.4785 6.5 L 6.5781 9.4004 L 8.3926 11.865 A 8.661 8.661 0 0 0 7.707 13.551 L 7.707 13.4 L 4.6074 13.9 L 4.6074 18 L 7.707 18.5 L 7.707 18.361 A 8.661 8.661 0 0 0 8.3945 20.033 L 6.5781 22.5 L 9.4785 25.4 L 12.01 23.609 A 8.661 8.661 0 0 0 13.395 24.189 L 13.971 27.199 L 18.033 27.199 L 18.547 24.215 A 8.661 8.661 0 0 0 20.014 23.621 L 22.529 25.4 L 25.43 22.5 L 23.635 20.059 A 8.661 8.661 0 0 0 24.289 18.496 L 27.369 18 L 27.369 13.9 L 24.283 13.402 A 8.661 8.661 0 0 0 23.631 11.848 L 25.43 9.4004 L 22.529 6.5 L 20.01 8.2832 A 8.661 8.661 0 0 0 18.564 7.6836 L 18.033 4.5996 L 13.971 4.5996 z M 15.988 10.828 A 5.0719 5.0719 0 0 1 21.061 15.9 A 5.0719 5.0719 0 0 1 15.988 20.973 A 5.0719 5.0719 0 0 1 10.916 15.9 A 5.0719 5.0719 0 0 1 15.988 10.828 z" />',
			'save': '<path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 6,26 l 20,0 0,-6 -6,0 -4,3 -4,-3 -6,0 Z M 16,20 l 8,-8 -5,0 0,-6 -6,0 0,6 -5,0" />',
			'about': '<path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 16,24 m -3,0 c 0,-4 6,-4 6,0 c 0,4 -6,4 -6,0 Z M 13,19 l 6,0 0,-4 c 6,0 6,-11 -3,-11 c -3,0 -8,2 -8,8 l 4,0 c 2,-10 11,0 2,2Z" />'
		};
		return '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'+(icons[icon]||"").replace(/%COLOUR%/g,(colour||"black"))+'</svg>';
	}

	/**
	 * @desc Parses any String of Data including '\r' '\n' characters, and returns an array with the rows of data.
	 * @param {String} str - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray(str, delimiter){
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

		var rows = [[]];	// array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec(str)) {
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

	/**
	 * @desc Parse a CSV file and return a JSON structure. Guesses the format of each column based on the data in it.
	 * @param {string} data - the CSV to parse
	 * @param {array} parse - set the format types for each column
	 */
	function CSV2JSON(data,parse){

		// Split by the end of line characters
		if(typeof data==="string") data = CSVToArray(data);

		var datum,formats,header,j,i;
		var newdata = [];

		formats = new Array(data[0].length);
		header = new Array(data[0].length);
		// Loop over each column in the line to find headers
		for(j=0; j < data[0].length; j++){
			header[j] = data[0][j];
			formats[j] = parse[header[j]] || "string";
		}

		for(i = 1 ; i < data.length; i++){
			// If there is no content on this line we skip it
			if(!data[i] || data[i] == "") continue;
			datum = {};
			// Loop over each column in the line
			for(j=0; j < data[i].length; j++){
				if(formats[j]=="number") datum[header[j]] = parseFloat(data[i][j]);
				else datum[header[j]] = data[i][j];
			}
			newdata.push(datum);
		}

		// Return the structured data
		return newdata;
	}

	/**
	 * @desc Add zeros to pad out a number
	 */
	function zeroPad(d,n){ if(!n){ n = 2;} d = d+''; while(d.length < n){ d = '0'+d; } return d; }

	// Build the functions that we are making available to looseJsonParse
	var fns = "function zeroPad(d,n){ if(!n){ n = 2;} d = d+''; while(d.length < n){ d = '0'+d; } return d; };";
	fns += "function timeFormat(t,f){ var d,micros,ds,dl,m,ms,ml; d = new Date(t*1000); micros = ''; m = (t+'').match(/\\.[0-9]{3}([0-9]+)/);if(m && m.length==2){ micros = m[1]; }; ds = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; dl = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; ml = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return f.replace(/\%a/g,ds[d.getDay()]).replace(/\%Y/g,d.getFullYear()).replace(/\%a/g,dl[d.getDay()]).replace(/\%b/g,ms[d.getMonth()]).replace(/\%B/g,ml[d.getMonth()]).replace(/\%d/g,(d.getDate().length==1 ? '0':'')+d.getDate()).replace(/\%m/,(d.getMonth()+1)).replace(/\%H/,zeroPad(d.getUTCHours())).replace(/\%M/,zeroPad(d.getUTCMinutes())).replace(/\%S/,zeroPad(d.getUTCSeconds())).replace(/\%L/, (zeroPad(d.getUTCMilliseconds(),3)+micros).replace(/([0-9])0+$/,function(m,p1){ return p1; }));};";
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

	// The month is zero-based for compatibility with VEGA
	// https://vega.github.io/vega/docs/expressions/#datetime
	fns += "function datetime(y,m,d,h,mn,sc,ms){ return (new Date(y+'-'+zeroPad(m+1,2)+'-'+(typeof d==='number' ? zeroPad(d,2):'01')+(typeof h==='number' ? 'T'+(zeroPad(h,2)+':'+(typeof mn==='number' ? zeroPad(mn,2)+(typeof sc==='number' ? ':'+zeroPad(sc,2)+(ms ? '.'+zeroPad(ms,3):''):''):'00'))+'Z':''))).valueOf()/1000; };";
	fns += "function date(d){ return (new Date(d)).getTime()/1000; };";

	function looseJsonParse(obj,d){
		// If we are using big.js for the value we need to convert any values to a plain-old number here
		if(typeof d==="object"){
			for(var m in d){
				if(typeof d[m]=="object" && d[m].type=="Num") d[m] = (typeof d[m].toValue==="function") ? d[m].toValue() : d[m].v;
			}
		}
		return Function('"use strict";'+fns+'var datum = '+JSON.stringify(d)+'; return ('+ obj + ')')();
	}

	/**
	 * @desc Make a copy of the object (to avoid over-writing it)
	 */
	function clone(a){ return JSON.parse(JSON.stringify(a)); }

	/**
	 * @desc Create an embed in the style of VEGA
	 */
	root.AASTimeSeriesEmbed = function(el,json,opt){
		var ts = TimeSeries.create(json,opt);
		ts.initialize(S(el)[0]);
		return;
	};

	/**
	 * @desc Convert a date from an input format to an output format
	 */
	function convertDate(dt,i,o){
		if(typeof dt==="number") dt = Num(dt);
		var dt2 = new Dates(dt,i);
		if(o=="jd") return dt2.toJD();
		else if(o=="mjd") return dt2.toMJD();
		else if(o=="tjd") return dt2.toTJD();
		else if(o=="unix") return dt2.toUNIX();
		else if(o=="seconds") return dt2.toSeconds();
		else if(o=="iso") return dt2.toDate().toISOString();
		return 0;
	}

	/**
	 * @desc Define a date convertor
	 */
	function Dates(v,input){
		this.epoch = {'jd':2440587.5,'mjd':2400000.5,'tjd':2440000.5};	// The epochs for Julian Date, MJD, and TJD
		this.d2ms = 86400000;	// Days to milliseconds
		if(typeof v==="number") v = Num(v);
		if(input=="jd") this.jd = v;
		if(input=="mjd") this.jd = v.plus(this.epoch.mjd);
		if(input=="tjd") this.jd = v.plus(this.epoch.tjd);
		if(input=="unix") this.unix = v;
		if(input=="iso" || input=="locale" || !input) this.unix = v.times(1000);
		this.toJD = function(){
			if(this.jd) return this.jd.toValue();
			if(this.unix) return this.unix.div(this.d2ms).plus(this.epoch.jd).toValue();
			return 0;
		};
		this.toUNIX = function(){
			if(this.unix) return this.unix.toValue();
			if(this.jd) return this.jd.minus(this.epoch.jd).times(this.d2ms).toValue();
			return 0;
		};
		this.toSeconds = function(){
			if(this.unix) return this.unix.div(1000).toValue();
			if(this.jd) return this.jd.minus(this.epoch.jd).times(this.d2ms).div(1000).toValue();
			return 0;
		};
		this.toMJD = function(){
			if(this.unix) this.jd = this.unix.div(this.d2ms).plus(this.epoch.jd);
			if(this.jd) return this.jd.minus(this.epoch.mjd).toValue();
			else return 0;
		};
		this.toTJD = function(){
			if(this.unix) this.jd = this.unix.div(this.d2ms).plus(this.epoch.jd);
			if(this.jd) return this.jd.minus(this.epoch.tjd).toValue();
			else return 0;
		};
		this.toDate = function(){
			if(this.jd) return new Date(this.toUNIX());
			if(this.unix) return new Date(this.unix.toValue());
			return new Date();
		};
		return this;
	}

	// Function to report if the element is on the screen or not
	function onscreen(e){
		var top = 0,left = 0,el = e;
		do {
			top += el.offsetTop  || 0;
			left += el.offsetLeft || 0;
			el = el.offsetParent;
		} while(el);
		return (window.scrollY+window.innerHeight+20 > top && window.scrollY < top+e.offsetHeight);
	}

	root.TimeSeries = TimeSeries;

})(window || this);